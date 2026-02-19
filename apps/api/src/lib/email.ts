import nodemailer from "nodemailer";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

function createTransport() {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_LOGIN!,
      pass: process.env.BREVO_SMTP_KEY!,
    },
  });
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${FRONTEND_URL}/verify-email/confirm?token=${token}`;
  const transporter = createTransport();

  await transporter.sendMail({
    from: `"TradeBit" <${process.env.BREVO_SMTP_LOGIN}>`,
    to,
    subject: "Verify your TradeBit email",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0f0f0f; color: #e5e5e5; border-radius: 12px;">
        <h2 style="color: #ffffff; margin-bottom: 8px;">Welcome to TradeBit!</h2>
        <p style="color: #a3a3a3; margin-bottom: 24px;">Click the button below to verify your email address. This link expires in 24 hours.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-bottom: 24px;">Verify my email</a>
        <p style="color: #737373; font-size: 12px; margin-bottom: 8px;">Or copy this URL into your browser:</p>
        <p style="color: #737373; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
        <hr style="border: none; border-top: 1px solid #262626; margin: 24px 0;" />
        <p style="color: #525252; font-size: 12px;">If you did not create a TradeBit account, you can safely ignore this email.</p>
      </div>
    `,
  });
}
