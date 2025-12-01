// emailService.ts
// Provides a single point for sending emails via Gmail using Nodemailer.
// This service is used for password resets and other user notifications.
// Credentials are loaded from environment variables for security.
import nodemailer from "nodemailer";

export const sendEmail = async (to: string, subject: string, text: string) => {
  // Using Gmail's SMTP service for reliable delivery.
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
