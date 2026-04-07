import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'SecureVote <auth@securevote.premjadhav.me>';

const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendOtpEmail(email, otp, purpose = 'verification') {
    if (!resend) {
        throw new Error('RESEND_API_KEY is not configured.');
    }

    const subject = `Verification: SecureVote ${purpose} code`;

    const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject,
        html: `
      <div style="font-family: sans-serif; max-width: 400px; padding: 20px; border: 1px solid #e1e1e1; border-radius: 8px;">
        <h2 style="color: #333;">Verification Code</h2>
        <p style="color: #555;">Enter the following code to continue on <strong>SecureVote</strong>:</p>
        <div style="background: #f4f7ff; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb; border-radius: 4px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #777;">This code expires in 10 minutes. If you did not request this code, please ignore this email.</p>
      </div>
    `
    });

    if (error) {
        throw new Error(error.message || 'Failed to send OTP email.');
    }

    return data;
}
