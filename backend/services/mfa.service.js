/**
 * MFA (Multi-Factor Authentication) Service
 * 
 * Handles TOTP-based 2FA setup, verification, and management.
 * Uses speakeasy for TOTP and qrcode for QR code generation.
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

const APP_NAME = 'UPTM Schedule';

/**
 * Generate a new TOTP secret and QR code for a user
 * @param {string} email - User's email for the QR label
 * @returns {Object} { secret (base32), qrCodeDataUrl, otpauthUrl }
 */
async function generateSecret(email) {
    const secret = speakeasy.generateSecret({
        name: `${APP_NAME} (${email})`,
        issuer: APP_NAME,
        length: 20
    });

    // Generate QR code as data URL for frontend display
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
        secret: secret.base32,
        qrCodeDataUrl,
        otpauthUrl: secret.otpauth_url
    };
}

/**
 * Verify a TOTP token against a secret
 * @param {string} secret - Base32 encoded secret
 * @param {string} token - 6-digit TOTP code
 * @returns {boolean} Whether the token is valid
 */
function verifyToken(secret, token) {
    const result = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: token.toString(),
        window: 2 // Allow 60 seconds tolerance
    });

    if (!result) {
        // Debug: show what the expected token is
        const expected = speakeasy.totp({
            secret,
            encoding: 'base32'
        });
        console.log(`[MFA DEBUG] Verification failed. Got: ${token}, Expected: ${expected}`);
    }

    return result;
}

/**
 * Enable MFA for a user after they verify a token
 * @param {string} userId - User's ID
 * @param {string} secret - Base32 TOTP secret from setup step
 * @param {string} token - 6-digit code to verify before enabling
 * @returns {Object} { success, backupCodes }
 */
async function enableMFA(userId, secret, token) {
    // Verify the token first to make sure they scanned correctly
    const isValid = verifyToken(secret, token);
    if (!isValid) {
        throw new Error('Invalid verification code. Please try again.');
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Hash backup codes for storage
    const hashedCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
    );

    // Save to database
    await query(
        `UPDATE users 
         SET mfa_enabled = true, 
             mfa_secret = $1, 
             mfa_backup_codes = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [secret, hashedCodes, userId]
    );

    logger.info(`MFA enabled for user ${userId}`);

    return {
        success: true,
        backupCodes // Return unhashed codes for user to save
    };
}

/**
 * Disable MFA for a user (requires token verification)
 * @param {string} userId - User ID
 * @param {string} token - Current 6-digit TOTP code
 * @returns {Object} { success }
 */
async function disableMFA(userId, token) {
    // Get user's current MFA secret
    const result = await query(
        'SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];

    if (!user.mfa_enabled) {
        throw new Error('MFA is not enabled on this account');
    }

    // Verify token before disabling
    const isValid = verifyToken(user.mfa_secret, token);
    if (!isValid) {
        throw new Error('Invalid verification code');
    }

    await query(
        `UPDATE users 
         SET mfa_enabled = false, 
             mfa_secret = NULL, 
             mfa_backup_codes = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [userId]
    );

    logger.info(`MFA disabled for user ${userId}`);

    return { success: true };
}

/**
 * Verify MFA token during login (supports both TOTP and backup codes)
 * @param {string} userId - User ID
 * @param {string} token - 6-digit TOTP code or backup code
 * @returns {Object} { success, usedBackupCode }
 */
async function verifyMFAToken(userId, token) {
    const result = await query(
        'SELECT mfa_secret, mfa_backup_codes FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];

    if (!user.mfa_secret) {
        throw new Error('MFA not configured');
    }

    // Try TOTP verification first
    const isValidTOTP = verifyToken(user.mfa_secret, token);
    if (isValidTOTP) {
        return { success: true, usedBackupCode: false };
    }

    // Try backup code
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const backupCodes = user.mfa_backup_codes || [];
    const codeIndex = backupCodes.indexOf(tokenHash);

    if (codeIndex !== -1) {
        // Remove used backup code
        const updatedCodes = [...backupCodes];
        updatedCodes.splice(codeIndex, 1);

        await query(
            'UPDATE users SET mfa_backup_codes = $1 WHERE id = $2',
            [updatedCodes, userId]
        );

        logger.warn(`Backup code used for user ${userId}. ${updatedCodes.length} codes remaining.`);

        return { success: true, usedBackupCode: true, remainingBackupCodes: updatedCodes.length };
    }

    throw new Error('Invalid verification code');
}

/**
 * Get MFA status for a user
 * @param {string} userId - User ID
 * @returns {Object} { mfaEnabled, backupCodesRemaining }
 */
async function getMFAStatus(userId) {
    const result = await query(
        'SELECT mfa_enabled, mfa_backup_codes FROM users WHERE id = $1',
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];
    return {
        mfaEnabled: user.mfa_enabled || false,
        backupCodesRemaining: (user.mfa_backup_codes || []).length
    };
}

/**
 * Generate 8 random backup codes
 * @returns {string[]} Array of 8 backup codes in format XXXX-XXXX
 */
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 8; i++) {
        const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        codes.push(`${part1}-${part2}`);
    }
    return codes;
}

module.exports = {
    generateSecret,
    verifyToken,
    enableMFA,
    disableMFA,
    verifyMFAToken,
    getMFAStatus
};
