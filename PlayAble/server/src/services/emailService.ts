import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const USE_MOCK_EMAIL = process.env.USE_MOCK_EMAIL === 'true';

export const sendEmail = async (to: string, subject: string, text: string): Promise<boolean> => {
  // Mock email service for development - logs to console instead of sending
  if (USE_MOCK_EMAIL) {
    console.log('\n=================================');
    console.log('📧 [MOCK EMAIL SERVICE]');
    console.log('=================================');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('---');
    console.log(text);
    console.log('=================================\n');
    return true;
  }

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn(
      '[emailService] EMAIL_USER or EMAIL_PASS missing. Email not sent. Message below:\n',
      { to, subject, text }
    );
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates (development only)
      }
    });

    await transporter.sendMail({
      from: EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log(`[emailService] Email sent successfully to ${to}`);
    return true;
  } catch (error: any) {
    console.error('[emailService] Failed to send email:', error.message);
    console.error('[emailService] Full error:', error);
    // Return false instead of throwing - don't crash the server
    return false;
  }
};

