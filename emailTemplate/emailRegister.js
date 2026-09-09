
const moment = require('moment');

const baseStyles = `
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F0F4F8; }
  @media screen and (max-width: 600px) {
    .otp-digit { font-size: 28px !important; padding: 12px 16px !important; }
  }
`;

// ─── REGISTRATION / OTP / 2FA EMAIL
const registerEmail = (sendCompanyName, sendTitle, sendReceiverName, otpCode, logo) => {
  const year = new Date().getFullYear();
  const isWelcome = sendTitle?.toLowerCase().includes('congratulations') || sendTitle?.toLowerCase().includes('welcome');
  const color = isWelcome ? '#10B981' : '#4C5FD5';
  const light = isWelcome ? '#D1FAE5' : '#EEF2FF';
  const icon = isWelcome ? '🎉' : '🔐';
  const label = isWelcome ? 'Welcome Aboard!' : 'Verify Your Account';

  const logoHtml = logo
    ? `<img src="${logo}" alt="${sendCompanyName}" style="height:40px; width:40px; border-radius:8px; object-fit:cover;" />`
    : `<div style="width:40px; height:40px; background:${color}; border-radius:8px; display:inline-block; text-align:center; line-height:40px; color:white; font-weight:800; font-size:18px;">${sendCompanyName?.charAt(0) || 'A'}</div>`;

  // Format OTP as individual digit boxes
  const otpDigits = String(otpCode).split('').map(d =>
    `<td style="padding:4px;">
      <div style="width:44px; height:56px; background:#ffffff; border:2px solid ${color}; border-radius:12px; text-align:center; line-height:56px; font-size:28px; font-weight:800; color:${color}; display:inline-block;">
        ${d}
      </div>
    </td>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${sendTitle} — ${sendCompanyName}</title>
  <style type="text/css">${baseStyles}</style>
</head>
<body style="margin:0; padding:0; background-color:#F0F4F8; font-family: 'Segoe UI', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0F4F8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${color} 0%, ${color}CC 100%); padding: 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle; padding-right:12px;">${logoHtml}</td>
                        <td style="vertical-align:middle;">
                          <span style="color:#ffffff; font-size:20px; font-weight:800;">${sendCompanyName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <span style="color:rgba(255,255,255,0.7); font-size:12px;">${moment().format('DD MMM YYYY')}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Icon -->
          <tr>
            <td align="center" style="padding: 40px 40px 16px;">
              <div style="width:80px; height:80px; background:${light}; border-radius:50%; display:inline-block; text-align:center; line-height:80px; font-size:36px;">
                ${icon}
              </div>
            </td>
          </tr>

          <!-- Label + Title -->
          <tr>
            <td align="center" style="padding: 0 40px 8px;">
              <p style="margin:0 0 8px; color:${color}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">${label}</p>
              <h1 style="margin:0; color:#1a1a2e; font-size:26px; font-weight:800; line-height:1.3;">${sendTitle}</h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td align="center" style="padding: 16px 40px;">
              <div style="width:48px; height:4px; background:${color}; border-radius:4px;"></div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <p style="margin:0; color:#374151; font-size:16px; line-height:1.6;">
                Hello <strong>${sendReceiverName}</strong>,<br/>
                ${isWelcome
                  ? `Welcome to <strong>${sendCompanyName}</strong>! We are excited to have you on board. Your account has been created successfully. Please use the OTP below to verify and activate your account.`
                  : `Your one-time verification code is below. Please use it to complete your verification. This code expires in <strong>10 minutes</strong>.`}
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding: 0 40px 32px;">
              <div style="background:${light}; border-radius:16px; padding:32px 24px; display:inline-block;">
                <p style="margin:0 0 16px; color:#6B7280; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Your Verification Code</p>
                <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                  <tr>${otpDigits}</tr>
                </table>
                <p style="margin:16px 0 0; color:#6B7280; font-size:12px;">
                  ⏰ This code expires in <strong>10 minutes</strong>
                </p>
              </div>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FEF3C7; border-radius:12px; border-left:4px solid #F59E0B;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; color:#92400E; font-size:13px; line-height:1.6;">
                      ⚠️ <strong>Never share this code</strong> with anyone. ${sendCompanyName} will never ask for your OTP via phone or chat. If you did not request this, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What's next -->
          ${isWelcome ? `
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin:0 0 12px; color:#1a1a2e; font-size:15px; font-weight:700;">🚀 Get started with ${sendCompanyName}:</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${['Complete your profile to unlock all features', 'Fund your wallet to start transacting', 'Earn rewards and bonuses on every transaction', 'Invite friends and earn referral bonuses'].map((item, i) =>
                  `<tr>
                    <td style="padding:6px 0;">
                      <div style="width:24px; height:24px; background:${color}; border-radius:50%; display:inline-block; text-align:center; line-height:24px; color:white; font-size:11px; font-weight:800; vertical-align:middle; margin-right:10px;">${i + 1}</div>
                      <span style="color:#374151; font-size:14px; vertical-align:middle;">${item}</span>
                    </td>
                  </tr>`
                ).join('')}
              </table>
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB; border-top:1px solid #E5E7EB; padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px; color:#1a1a2e; font-size:16px; font-weight:800;">${sendCompanyName}</p>
                    <p style="margin:0 0 16px; color:#9CA3AF; font-size:12px;">The secure and profitable way to manage your virtual funds</p>
                    <div style="margin-bottom:16px;">
                      <a href="#" style="color:${color}; font-size:12px; text-decoration:none; margin:0 8px;">Support</a>
                      <span style="color:#D1D5DB;">|</span>
                      <a href="#" style="color:${color}; font-size:12px; text-decoration:none; margin:0 8px;">Privacy Policy</a>
                      <span style="color:#D1D5DB;">|</span>
                      <a href="#" style="color:${color}; font-size:12px; text-decoration:none; margin:0 8px;">Terms</a>
                    </div>
                    <p style="margin:0; color:#9CA3AF; font-size:11px; line-height:1.6;">
                      &copy; ${year} ${sendCompanyName}. All rights reserved.<br/>
                      You received this because you registered on ${sendCompanyName}.<br/>
                      This code is confidential — do not share with anyone.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
};

const registerEmailText = (sendReceiverName, otpCode) =>
  `Hello ${sendReceiverName},\n\nYour verification code is: ${otpCode}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nThank you.`;

// ─── 2FA EMAIL — SAME TEMPLATE AS REGISTER
const _2FAEmail = (sendCompanyName, sendTitle, sendReceiverName, otpCode, logo) =>
  registerEmail(sendCompanyName, sendTitle || '2FA Verification', sendReceiverName, otpCode, logo);

const _2FAEmailText = (sendReceiverName, otpCode) =>
  `Hello ${sendReceiverName},\n\nYour 2FA verification code is: ${otpCode}\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\nThank you.`;

const transactEmail = registerEmail;
const transactEmailText = registerEmailText;

module.exports = {
  registerEmail,
  registerEmailText,
  transactEmail,
  transactEmailText,
  _2FAEmail,
  _2FAEmailText,
};