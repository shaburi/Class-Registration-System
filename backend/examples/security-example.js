/**
 * Example: Audit Logging and Security Features
 * 
 * Demonstrates the comprehensive audit logging and security measures
 */

const { getAuditLogs } = require('../middleware/audit');
const {
    hashUserId,
    encrypt,
    decrypt,
    trackFailedLogin,
    checkLockout,
    resetLoginAttempts
} = require('../middleware/security');

/**
 * Example: SHA-256 Hashing for Privacy
 * 
 * User IDs are hashed before storing in audit logs for privacy
 */
function exampleHashingForPrivacy() {
    const userId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    console.log('Original User ID:', userId);

    // Hash the user ID
    const hashedId = hashUserId(userId);
    console.log('Hashed User ID (SHA-256):', hashedId);
    console.log('Hash length:', hashedId.length, 'characters (64 hex chars = 256 bits)\n');

    console.log('Benefits:');
    console.log('  - Same user always produces same hash (for querying)');
    console.log('  - Impossible to reverse the hash to get original ID');
    console.log('  - Different users produce completely different hashes');
    console.log('  - Audit logs are anonymous but still traceable\n');

    // Demonstrate consistency
    const hash2 = hashUserId(userId);
    console.log('Hashing same ID again:', hash2);
    console.log('Hashes match:', hashedId === hash2, '\n');
}

/**
 * Example: AES-256 Encryption for Sensitive Data
 * 
 * Request bodies in audit logs are encrypted
 */
function exampleEncryption() {
    const sensitiveData = JSON.stringify({
        email: 'student@uptm.edu.my',
        studentId: 'S2020001',
        reason: 'Need this class for graduation'
    });

    console.log('Original Data:', sensitiveData, '\n');

    // Encrypt the data
    const encrypted = encrypt(sensitiveData);
    console.log('Encrypted (AES-256-CBC):', encrypted);
    console.log('Encrypted length:', encrypted.length, 'characters\n');

    // Decrypt to verify
    const decrypted = decrypt(encrypted);
    console.log('Decrypted Data:', decrypted);
    console.log('Matches original:', decrypted === sensitiveData, '\n');

    console.log('Security notes:');
    console.log('  - Uses AES-256-CBC (industry standard)');
    console.log('  - Random IV for each encryption (prevents pattern analysis)');
    console.log('  - Only admins with key can decrypt');
    console.log('  - Key stored in environment variables (not in code)\n');
}

/**
 * Example: Brute Force Protection
 * 
 * Tracks failed login attempts and locks accounts after threshold
 */
async function exampleBruteForceProtection() {
    const ipAddress = '192.168.1.100';

    console.log('Brute Force Protection Demo:\n');
    console.log(`IP Address: ${ipAddress}\n`);

    // Simulate 5 failed login attempts
    for (let i = 1; i <= 5; i++) {
        trackFailedLogin(ipAddress);
        const status = checkLockout(ipAddress);

        console.log(`Attempt ${i}:`);
        if (status.isLocked) {
            console.log(`  ✗ LOCKED OUT!`);
            console.log(`  Remaining lockout time: ${status.remainingMinutes} minutes`);
            console.log(`  Total failed attempts: ${status.attempts}\n`);
        } else {
            console.log(`  Attempts: ${status.attempts || 0}/5`);
            console.log(`  Status: Not locked\n`);
        }
    }

    console.log('Security benefits:');
    console.log('  - Prevents automated brute force attacks');
    console.log('  - 15-minute lockout after 5 failed attempts');
    console.log('  - Protects against credential stuffing');
    console.log('  - All attempts are logged in audit logs\n');

    // Reset after successful login
    resetLoginAttempts(ipAddress);
    console.log('After successful login: Attempts reset to 0\n');
}

/**
 * Example: Querying Audit Logs
 * 
 * HOP and admins can query audit logs for security analysis
 */
async function exampleQueryAuditLogs() {
    const userId = 'student-uuid';

    console.log('Querying Audit Logs:\n');

    // Get all actions by a specific user
    const userLogs = await getAuditLogs({
        userId: userId,
        limit: 10
    });

    console.log(`Recent actions by user (last 10):`);
    userLogs.forEach(log => {
        console.log(`  ${log.created_at} - ${log.action_type} - Status: ${log.response_status}`);
    });
    console.log('');

    // Get suspicious activity
    const suspiciousLogs = await getAuditLogs({
        isSuspicious: true,
        limit: 10
    });
    console.log(`Suspicious activities detected: ${suspiciousLogs.length}`);
    suspiciousLogs.forEach(log => {
        console.log(`  ${log.created_at} - ${log.action_type}`);
        console.log(`    Reason: ${log.suspicious_reason}`);
        console.log(`    IP: ${log.ip_address}\n`);
    });

    // Get failed registration attempts
    const failedRegistrations = await getAuditLogs({
        actionType: 'REGISTER_SECTION',
        startDate: new Date('2026-01-01'),
        endDate: new Date(),
        limit: 20
    });

    console.log(`Failed registration attempts: ${failedRegistrations.length}`);
}

/**
 * Example: Suspicious Activity Detection
 * 
 * The system automatically detects potential attacks
 */
function exampleSuspiciousActivityDetection() {
    const { detectSuspiciousActivity } = require('../middleware/security');

    console.log('Suspicious Activity Detection:\n');

    // Test 1: SQL Injection attempt
    const sqlInjectionReq = {
        body: { email: "admin' OR '1'='1" },
        query: {},
        params: {}
    };

    console.log('Test 1: SQL Injection Attempt');
    console.log(`  Input: ${sqlInjectionReq.body.email}`);
    const result1 = detectSuspiciousActivity(sqlInjectionReq);
    console.log(`  Detected: ${result1.isSuspicious}`);
    if (result1.isSuspicious) {
        console.log(`  Reason: ${result1.reason}\n`);
    }

    // Test 2: XSS attempt
    const xssReq = {
        body: { name: "<script>alert('XSS')</script>" },
        query: {},
        params: {}
    };

    console.log('Test 2: XSS Attempt');
    console.log(`  Input: ${xssReq.body.name}`);
    const result2 = detectSuspiciousActivity(xssReq);
    console.log(`  Detected: ${result2.isSuspicious}`);
    if (result2.isSuspicious) {
        console.log(`  Reason: ${result2.reason}\n`);
    }

    // Test 3: Path traversal attempt
    const pathTraversalReq = {
        body: {},
        query: { file: "../../etc/passwd" },
        params: {}
    };

    console.log('Test 3: Path Traversal Attempt');
    console.log(`  Input: ${pathTraversalReq.query.file}`);
    const result3 = detectSuspiciousActivity(pathTraversalReq);
    console.log(`  Detected: ${result3.isSuspicious}`);
    if (result3.isSuspicious) {
        console.log(`  Reason: ${result3.reason}\n`);
    }

    console.log('What happens when detected:');
    console.log('  - Request is logged with is_suspicious=true');
    console.log('  - Security team is alerted');
    console.log('  - IP may be temporarily blocked after repeated attempts');
    console.log('  - Pattern is added to threat intelligence\n');
}

/**
 * Example: Complete Audit Trail
 * 
 * Shows what information is captured for each request
 */
function exampleCompleteAuditTrail() {
    console.log('Complete Audit Trail for Each Request:\n');

    console.log('Captured Information:');
    console.log('  ✓ User ID (SHA-256 hashed)');
    console.log('  ✓ User role (student/lecturer/hop)');
    console.log('  ✓ IP address');
    console.log('  ✓ User agent (browser/device info)');
    console.log('  ✓ Action type (e.g., REGISTER_SECTION)');
    console.log('  ✓ Resource type & ID');
    console.log('  ✓ HTTP method & path');
    console.log('  ✓ Request body (encrypted)');
    console.log('  ✓ Response status code');
    console.log('  ✓ Suspicious activity flag');
    console.log('  ✓ Timestamp (with timezone)\n');

    console.log('Example audit log entry:');
    console.log({
        id: 'uuid',
        user_id_hash: '5f4dcc3b5aa765d61d8327deb882cf99...',
        user_role: 'student',
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0...',
        action_type: 'REGISTER_SECTION',
        resource_type: 'registration',
        resource_id: 'section-uuid',
        request_method: 'POST',
        request_path: '/api/v1/student/register/section-uuid',
        request_body_encrypted: 'a1b2c3d4:e5f6...',
        response_status: 201,
        is_suspicious: false,
        suspicious_reason: null,
        created_at: '2026-01-09T16:49:35+08:00'
    });
    console.log('\n');

    console.log('Compliance benefits:');
    console.log('  - Complete audit trail for compliance');
    console.log('  - Tamper-proof logging');
    console.log('  - Privacy-preserving (hashed IDs)');
    console.log('  - Forensics-ready for investigations');
    console.log('  - Meets GDPR/education sector requirements\n');
}

// Export examples
module.exports = {
    exampleHashingForPrivacy,
    exampleEncryption,
    exampleBruteForceProtection,
    exampleQueryAuditLogs,
    exampleSuspiciousActivityDetection,
    exampleCompleteAuditTrail
};
