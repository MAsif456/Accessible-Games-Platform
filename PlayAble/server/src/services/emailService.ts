import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

export const sendEmail = async (to: string, subject: string, text: string) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn(
      '[emailService] EMAIL_USER or EMAIL_PASS missing. Email not sent. Message below:\n',
      { to, subject, text }
    );
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: EMAIL_USER,
    to,
    subject,
    text,
  });
};

