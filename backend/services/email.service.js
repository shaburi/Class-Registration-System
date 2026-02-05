const nodemailer = require('nodemailer');

// Email configuration - uses environment variables
// Set these in your .env file:
// EMAIL_HOST=smtp.gmail.com
// EMAIL_PORT=587
// EMAIL_USER=your-email@gmail.com
// EMAIL_PASS=your-app-password (not your regular password!)
// EMAIL_FROM=UPTM Registration <your-email@gmail.com>

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection on startup
const verifyConnection = async () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('[EMAIL] Email service disabled - credentials not configured');
        return false;
    }

    try {
        await transporter.verify();
        console.log('[EMAIL] Email service connected successfully');
        return true;
    } catch (error) {
        console.error('[EMAIL] Email service connection failed:', error.message);
        return false;
    }
};

// Email templates
const templates = {
    registrationConfirmed: (studentName, courseName, section) => ({
        subject: '✅ Registration Confirmed - UPTM',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Registration Confirmed! 🎉</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${studentName}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        You have been successfully registered for:
                    </p>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #6366f1; margin: 0 0 8px 0;">${courseName}</h3>
                        <p style="color: #6b7280; margin: 0;">Section ${section}</p>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        Check your timetable in the UPTM portal for schedule details.
                    </p>
                </div>
            </div>
        `
    }),

    dropRequestApproved: (studentName, courseName) => ({
        subject: '✅ Drop Request Approved - UPTM',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 16px 16px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Drop Request Approved ✓</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${studentName}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Your request to drop <strong>${courseName}</strong> has been approved.
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        This course has been removed from your registration.
                    </p>
                </div>
            </div>
        `
    }),

    dropRequestRejected: (studentName, courseName, reason) => ({
        subject: '❌ Drop Request Rejected - UPTM',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 16px 16px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Drop Request Rejected</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${studentName}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Your request to drop <strong>${courseName}</strong> has been rejected.
                    </p>
                    ${reason ? `
                        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <strong style="color: #991b1b;">Reason:</strong>
                            <p style="color: #7f1d1d; margin: 8px 0 0 0;">${reason}</p>
                        </div>
                    ` : ''}
                    <p style="color: #6b7280; font-size: 14px;">
                        Please contact your Head of Programme for more information.
                    </p>
                </div>
            </div>
        `
    }),

    manualJoinApproved: (studentName, courseName, section) => ({
        subject: '✅ Manual Join Approved - UPTM',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 16px 16px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Manual Join Approved! 🎉</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${studentName}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Your request to join <strong>${courseName}</strong> (Section ${section}) has been approved!
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        Check your timetable for the updated schedule.
                    </p>
                </div>
            </div>
        `
    }),

    manualJoinRejected: (studentName, courseName, reason) => ({
        subject: '❌ Manual Join Rejected - UPTM',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 16px 16px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Manual Join Rejected</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Hi <strong>${studentName}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Your request to join <strong>${courseName}</strong> has been rejected.
                    </p>
                    ${reason ? `
                        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin: 15px 0;">
                            <strong style="color: #92400e;">Reason:</strong>
                            <p style="color: #78350f; margin: 8px 0 0 0;">${reason}</p>
                        </div>
                    ` : ''}
                    <p style="color: #6b7280; font-size: 14px;">
                        Try registering for a different section with available seats.
                    </p>
                </div>
            </div>
        `
    })
};

// Send email function
const sendEmail = async (to, templateName, templateData) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log(`[EMAIL] Skipped (not configured): ${templateName} to ${to}`);
        return false;
    }

    try {
        const template = templates[templateName](...templateData);

        await transporter.sendMail({
            from: process.env.EMAIL_FROM || `UPTM Registration <${process.env.EMAIL_USER}>`,
            to,
            subject: template.subject,
            html: template.html
        });

        console.log(`[EMAIL] Sent ${templateName} to ${to}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL] Failed to send ${templateName} to ${to}:`, error.message);
        return false;
    }
};

module.exports = {
    verifyConnection,
    sendEmail,
    templates
};
