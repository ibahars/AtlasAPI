import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Şifre Sıfırlama - Atlas",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Şifrenizi mi unuttunuz?</h2>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın. Bu bağlantı 1 saat boyunca geçerlidir.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
          Şifremi Sıfırla
        </a>
        <p style="color:#888;font-size:12px;margin-top:24px;">
          Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.
        </p>
      </div>
    `,
  });
}

export async function sendVerificationEmail(to, token) {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: "E-posta Adresinizi Doğrulayın - Atlas",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Atlas'a hoş geldiniz!</h2>
        <p>Hesabınızı aktifleştirmek için e-posta adresinizi doğrulayın.</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
          E-postamı Doğrula
        </a>
      </div>
    `,
  });
}