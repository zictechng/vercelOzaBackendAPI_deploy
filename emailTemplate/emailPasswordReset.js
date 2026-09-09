
const moment = require('moment');

const baseStyles = `
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F0F4F8; }
  @media screen and (max-width: 600px) {
    .otp-digit { font-size: 26px !important; padding: 10px 14px !important; }
    .mobile-padding { padding: 20px !important; }
  }
`;

const passwordResetEmail = (sendCompanyName, sendTitle, sendReceiverName, sendMessage, otpCode, logo) => {
  const year = new Date().getFullYear();
  const color = '#F59E0B';
  const light = '#FEF3C7';

  const logoHtml = logo
    ? `<img src="${logo}" alt="${sendCompanyName}" style="height:40px; width:40px; border-radius:8px; object-fit:cover;" />`
    : `<div style="width:40px; height:40px; background:#4C5FD5; border-radius:8px; display:inline-block; text-align:center; line-height:40px; color:white; font-weight:800; font-size:18px;">${sendCompanyName?.charAt(0) || 'A'}</div>`;

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
<body style="margin:0; padding:0; background-color:#F0F4F8; font-family:'Segoe UI', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0F4F8;">
    <tr>
      <td align="center" style="padding:40px 20px;">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px; background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding:32px 40px;">
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
                    <span style="color:rgba(255,255,255,0.7); font-size:12px;">${moment().format('DD MMM YYYY, hh:mm A')}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Icon -->
          <tr>
            <td align="center" style="padding:40px 40px 16px;">
              <div style="width:80px; height:80px; background:${light}; border-radius:50%; display:inline-block; text-align:center; line-height:80px; font-size:36px;">
                🔑
              </div>
            </td>
          </tr>

          <!-- Label + Title -->
          <tr>
            <td align="center" style="padding:0 40px 8px;">
              <p style="margin:0 0 8px; color:${color}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">Password Reset</p>
              <h1 style="margin:0; color:#1a1a2e; font-size:26px; font-weight:800; line-height:1.3;">${sendTitle}</h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td align="center" style="padding:16px 40px;">
              <div style="width:48px; height:4px; background:${color}; border-radius:4px;"></div>
            </td>
          </tr>

          <!-- Greeting + Message -->
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0 0 12px; color:#374151; font-size:16px; line-height:1.6;">
                Hello <strong>${sendReceiverName}</strong>,
              </p>
              <p style="margin:0; color:#374151; font-size:15px; line-height:1.8;">
                ${sendMessage || 'We received a request to reset your password. Use the OTP code below to complete the process. This code is valid for <strong>30 minutes</strong>.'}
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding:0 40px 32px;">
              <div style="background:${light}; border-radius:16px; padding:32px 24px;">
                <p style="margin:0 0 16px; color:#92400E; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">
                  🔐 Your Password Reset OTP
                </p>
                <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                  <tr>${otpDigits}</tr>
                </table>
                <p style="margin:16px 0 0; color:#92400E; font-size:12px; font-weight:600;">
                  ⏰ Expires in <strong>30 minutes</strong>
                </p>
              </div>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 12px; color:#1a1a2e; font-size:15px; font-weight:700;">How to reset your password:</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${[
                  'Enter the OTP code above in the verification field',
                  'Create a new strong password (min. 8 characters)',
                  'Confirm your new password and submit',
                  'Login with your new password',
                ].map((step, i) =>
                  `<tr>
                    <td style="padding:6px 0; vertical-align:top;">
                      <div style="width:24px; height:24px; background:#F59E0B; border-radius:50%; display:inline-block; text-align:center; line-height:24px; color:white; font-size:11px; font-weight:800; vertical-align:middle; margin-right:10px;">${i + 1}</div>
                      <span style="color:#374151; font-size:14px; vertical-align:middle;">${step}</span>
                    </td>
                  </tr>`
                ).join('')}
              </table>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#FEE2E2; border-radius:12px; border-left:4px solid #EF4444;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0; color:#991B1B; font-size:13px; line-height:1.6;">
                      ⚠️ <strong>Did not request this?</strong> If you did not request a password reset, please ignore this email and contact our support immediately. Your account may be at risk.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 40px 40px;">
              <a href="#" style="display:inline-block; background:linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 40px; border-radius:12px; letter-spacing:0.3px;">
                Contact Support &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB; border-top:1px solid #E5E7EB; padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 8px; color:#1a1a2e; font-size:16px; font-weight:800;">${sendCompanyName}</p>
                    <p style="margin:0 0 16px; color:#9CA3AF; font-size:12px;">The secure and profitable way to manage your virtual funds</p>
                    <div style="margin-bottom:16px;">
                      <a href="#" style="color:#F59E0B; font-size:12px; text-decoration:none; margin:0 8px;">Support</a>
                      <span style="color:#D1D5DB;">|</span>
                      <a href="#" style="color:#F59E0B; font-size:12px; text-decoration:none; margin:0 8px;">Privacy Policy</a>
                      <span style="color:#D1D5DB;">|</span>
                      <a href="#" style="color:#F59E0B; font-size:12px; text-decoration:none; margin:0 8px;">Terms</a>
                    </div>
                    <p style="margin:0; color:#9CA3AF; font-size:11px; line-height:1.6;">
                      &copy; ${year} ${sendCompanyName}. All rights reserved.<br/>
                      This OTP is confidential — never share it with anyone.<br/>
                      ${sendCompanyName} will never ask for your OTP via phone or chat.
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

const passwordResetText = (sendReceiverName, otpCode) =>
  `Hello ${sendReceiverName},\n\nYour password reset OTP code is: ${otpCode}\n\nThis code expires in 30 minutes. Do not share it with anyone.\n\nIf you did not request this, please contact support immediately.\n\nThank you.`;

module.exports = { passwordResetEmail, passwordResetText };