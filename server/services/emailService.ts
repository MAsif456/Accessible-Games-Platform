/**
 * Email Service
 *
 * @module emailService
 * @description
 * Provides email sending functionality via Gmail SMTP using Nodemailer.
 * Used for password reset codes and other user notifications.
 *
 * **Features:**
 * - Password reset verification codes
 * - User notifications
 * - Reliable delivery via Gmail SMTP
 *
 * **Security:**
 * - Credentials loaded from environment variables
 * - Gmail App Password recommended (not regular password)
 * - TLS/SSL encryption for email transmission
 *
 * **Production Considerations:**
 * - Consider using dedicated email service (SendGrid, AWS SES)
 * - Implement email queuing for reliability
 * - Add retry logic for failed sends
 * - Monitor delivery rates and bounces
 *
 * **Environment Variables Required:**
 * - EMAIL_USER: Gmail address
 * - EMAIL_PASS: Gmail app password (not regular password)
 */
import nodemailer from "nodemailer";

/**
 * Sends an email via Gmail SMTP.
 *
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Plain text email body
 * @returns {Promise<void>}
 *
 * @description
 * Sends a plain text email using Gmail's SMTP service with Nodemailer.
 *
 * **Configuration:**
 * - Service: Gmail SMTP (smtp.gmail.com:587)
 * - Authentication: App Password (not regular Gmail password)
 * - Transport: TLS/STARTTLS
 *
 * **Gmail Setup:**
 * 1. Enable 2-factor authentication on Gmail account
 * 2. Generate App Password at https://myaccount.google.com/apppasswords
 * 3. Set EMAIL_USER and EMAIL_PASS environment variables
 *
 * **Error Handling:**
 * - Throws error if email fails to send
 * - Caller should handle errors and retry if needed
 * - Check Gmail security settings if authentication fails
 *
 * **Security Considerations:**
 * - Never commit EMAIL_PASS to version control
 * - Use Gmail App Passwords, not regular password
 * - Validate recipient email format before calling
 * - Consider rate limiting to avoid spam flags
 *
 * **Usage Examples:**
 * Password reset email, account notifications, etc.
 *
 * @throws {Error} If SMTP connection fails
 * @throws {Error} If authentication fails
 * @throws {Error} If email delivery fails
 *
 * @example
 * await sendEmail(
 *   'user@example.com',
 *   'Password Reset - PlayAble',
 *   'Your verification code is: 123456'
 * );
 *
 * @example
 * // With error handling
 * try {
 *   await sendEmail(email, subject, body);
 *   console.log('Email sent successfully');
 * } catch (error) {
 *   console.error('Failed to send email:', error);
 *   // Retry or queue for later
 * }
 */
export const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
  // Create transporter with Gmail SMTP configuration
  const transporter = nodemailer.createTransport({
    service: "gmail", // Uses Gmail's SMTP server (smtp.gmail.com:587)
    auth: {
      user: process.env.EMAIL_USER,   // Gmail address
      pass: process.env.EMAIL_PASS,   // Gmail app password (NOT regular password)
    },
  });

  // Send email with plain text content
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};
