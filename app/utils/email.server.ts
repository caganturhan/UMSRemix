import nodemailer from 'nodemailer';
import { logger } from './logger.server';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.APP_URL}/verify-email/${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify your email address',
      html: `
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
      `,
    });
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error(`Error sending verification email to ${email}:`, error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password/${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error(`Error sending password reset email to ${email}:`, error);
    throw new Error('Failed to send password reset email');
  }
}