/**
 * Email Service - Provides email sending functionality via Gmail SMTP using Nodemailer.
 */
import nodemailer from "nodemailer";

/**
 * Sends an email via Gmail SMTP.
 */
export const sendEmail = async (to: string, subject: string, text: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  });
};
