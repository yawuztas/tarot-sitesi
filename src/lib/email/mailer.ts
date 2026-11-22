import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  sent: boolean;
  provider: 'resend' | 'smtp' | 'dev-preview' | 'none';
  error?: string;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'Mystic Tarot <onboarding@resend.dev>';
}

/**
 * Tek merkezli e-posta gönderici:
 * 1. RESEND_API_KEY varsa Resend REST API üzerinden gönderir (Vercel uyumlu)
 * 2. SMTP_HOST + SMTP_USER + SMTP_PASS varsa Nodemailer SMTP ile gönderir
 * 3. Hiçbiri yoksa geliştirme ortamında simüle eder (production'da hata döner)
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<SendEmailResult> {
  const from = getFromAddress();

  // 1. Resend API
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey && resendKey !== 'placeholder') {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        console.error('Resend send failed:', resp.status, errBody);
        return { sent: false, provider: 'resend', error: 'E-posta gönderilemedi' };
      }

      return { sent: true, provider: 'resend' };
    } catch (err) {
      console.error('Resend network error:', err);
      return { sent: false, provider: 'resend', error: 'E-posta servisine ulaşılamadı' };
    }
  }

  // 2. Nodemailer SMTP (Gmail, Yandex, cPanel, Brevo SMTP vb.)
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `Mystic Tarot <${smtpUser}>`,
        to,
        subject,
        text,
        html,
      });

      return { sent: true, provider: 'smtp' };
    } catch (err) {
      console.error('SMTP send failed:', err);
      return { sent: false, provider: 'smtp', error: 'SMTP ile e-posta gönderilemedi' };
    }
  }

  // 3. Yapılandırılmamış
  if (process.env.NODE_ENV !== 'production') {
    console.info(`[DEV EMAIL PREVIEW] To: ${to} | Subject: ${subject}\n${text}`);
    return { sent: true, provider: 'dev-preview' };
  }

  console.warn('Email provider is not configured (RESEND_API_KEY or SMTP_* missing).');
  return { sent: false, provider: 'none', error: 'E-posta servisi yapılandırılmamış' };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPasswordResetEmail({
  displayName,
  resetUrl,
}: {
  displayName?: string | null;
  resetUrl: string;
}) {
  const safeName = escapeHtml(displayName || 'Sevgili Yolcu');
  const safeUrl = escapeHtml(resetUrl);

  const subject = 'Mystic Tarot · Şifre Sıfırlama Mührü';

  const text = [
    `Merhaba ${displayName || 'Sevgili Yolcu'},`,
    '',
    'Mystic Tarot hesabın için bir şifre sıfırlama talebi aldık.',
    'Yeni şifreni belirlemek için aşağıdaki bağlantıya tıkla (30 dakika geçerlidir):',
    resetUrl,
    '',
    'Bu talebi sen oluşturmadıysan bu e-postayı güvenle görmezden gelebilirsin.',
    '— Mystic Tarot',
  ].join('\n');

  const html = `
  <div style="background:#090312;color:#f4f4f5;font-family:Georgia,serif;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#130724;border:1px solid rgba(245,158,11,0.35);border-radius:16px;padding:32px;">
      <div style="text-align:center;margin-bottom:20px;">
        <span style="color:#fbbf24;font-size:12px;letter-spacing:3px;text-transform:uppercase;">✦ Mystic Tarot ✦</span>
        <h1 style="color:#fef3c7;font-size:22px;margin:10px 0 0;">Şifre Sıfırlama Mührü</h1>
      </div>
      <p style="font-size:14px;line-height:1.7;color:#d4d4d8;">
        Merhaba <strong>${safeName}</strong>,
      </p>
      <p style="font-size:14px;line-height:1.7;color:#d4d4d8;">
        Hesabın için bir şifre sıfırlama isteği aldık. Aşağıdaki düğmeye tıklayarak yeni şifreni belirleyebilirsin. Bu bağlantı güvenlik gereği <strong>30 dakika</strong> geçerlidir.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(90deg,#f59e0b,#d97706);color:#090312;font-weight:bold;text-decoration:none;padding:12px 26px;border-radius:10px;font-size:14px;">
          Yeni Şifremi Belirle
        </a>
      </div>
      <p style="font-size:12px;color:#a1a1aa;line-height:1.6;">
        Düğme çalışmazsa bağlantıyı tarayıcına yapıştır:<br/>
        <span style="color:#fcd34d;word-break:break-all;">${safeUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid rgba(168,85,247,0.2);margin:24px 0;"/>
      <p style="font-size:11px;color:#71717a;text-align:center;margin:0;">
        Bu talebi sen oluşturmadıysan bu mesajı görmezden gelebilirsin; şifren değişmeyecektir.
      </p>
    </div>
  </div>
  `.trim();

  return { subject, html, text };
}
