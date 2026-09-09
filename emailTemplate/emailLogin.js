
const moment = require('moment');

// ─── SHARED BASE STYLES
const baseStyles = `
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  table { border-collapse: collapse !important; }
  body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F0F4F8; }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; }
  @media screen and (max-width: 600px) {
    .mobile-padding { padding: 20px !important; }
    .mobile-text { font-size: 14px !important; }
    .mobile-title { font-size: 22px !important; }
    .mobile-hide { display: none !important; }
  }
`;

// ─── GET ICON & COLOR BY TITLE TYPE
const getEmailStyle = (title) => {
  const t = title?.toLowerCase() || '';

  if (t.includes('login') || t.includes('sign in') || t.includes('access'))
    return { icon: '🔐', color: '#4C5FD5', light: '#EEF2FF', label: 'Security Alert' };
  if (t.includes('fund') || t.includes('credit') || t.includes('payment') || t.includes('deposit'))
    return { icon: '💰', color: '#10B981', light: '#D1FAE5', label: 'Payment Notification' };
  if (t.includes('withdraw'))
    return { icon: '💸', color: '#F59E0B', light: '#FEF3C7', label: 'Withdrawal Notification' };
  if (t.includes('approved') || t.includes('congratulations') || t.includes('activated') || t.includes('success'))
    return { icon: '✅', color: '#10B981', light: '#D1FAE5', label: 'Great News!' };
  if (t.includes('reject') || t.includes('issue') || t.includes('cancel') || t.includes('failed'))
    return { icon: '❌', color: '#EF4444', light: '#FEE2E2', label: 'Action Required' };
  if (t.includes('2fa') || t.includes('otp') || t.includes('verification') || t.includes('auth'))
    return { icon: '🛡️', color: '#8B5CF6', light: '#EDE9FE', label: 'Security Code' };
  if (t.includes('password') || t.includes('reset'))
    return { icon: '🔑', color: '#F59E0B', light: '#FEF3C7', label: 'Password Reset' };
  if (t.includes('transaction') || t.includes('exchange') || t.includes('transfer'))
    return { icon: '🔄', color: '#4C5FD5', light: '#EEF2FF', label: 'Transaction Update' };
  if (t.includes('ticket') || t.includes('support'))
    return { icon: '🎫', color: '#06B6D4', light: '#CFFAFE', label: 'Support Ticket' };
  if (t.includes('account') || t.includes('profile'))
    return { icon: '👤', color: '#4C5FD5', light: '#EEF2FF', label: 'Account Update' };
  if (t.includes('notification') || t.includes('in-app'))
    return { icon: '🔔', color: '#8B5CF6', light: '#EDE9FE', label: 'Notification Update' };
  if (t.includes('deactivat') || t.includes('delete') || t.includes('block'))
    return { icon: '⚠️', color: '#EF4444', light: '#FEE2E2', label: 'Account Notice' };

  return { icon: '📧', color: '#4C5FD5', light: '#EEF2FF', label: 'Notification' };
};

// ─── MAIN LOGIN/GENERAL EMAIL TEMPLATE
const loginEmail = (sendCompanyName, sendTitle, sendReceiverName, sendMessage, logo) => {
  const { icon, color, light, label } = getEmailStyle(sendTitle);
  const year = new Date().getFullYear();
    // Handle both URL string and pre-built img tag
  const logoHtml = !logo
    ? `<div style="width:40px; height:40px; background:${color}; border-radius:8px; display:inline-block; text-align:center; line-height:40px; color:white; font-weight:800; font-size:18px;">${sendCompanyName?.charAt(0) || 'A'}</div>`
    : logo.startsWith('<img')
    ? logo
    : `<img src="${logo}" alt="${sendCompanyName}" style="height:40px; width:40px; border-radius:8px; object-fit:cover;" />`;
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

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F0F4F8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Email Card -->
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
                          <span style="color:#ffffff; font-size:20px; font-weight:800; letter-spacing:-0.5px;">${sendCompanyName}</span>
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

          <!-- Icon Badge -->
          <tr>
            <td align="center" style="padding: 40px 40px 0;">
              <div style="width:72px; height:72px; background:${light}; border-radius:50%; display:inline-block; text-align:center; line-height:72px; font-size:32px; margin-bottom:16px;">
                ${icon}
              </div>
              <p style="margin:0; color:${color}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.5px;">${label}</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding: 16px 40px 0;">
              <h1 style="margin:0; color:#1a1a2e; font-size:26px; font-weight:800; line-height:1.3;">${sendTitle}</h1>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td align="center" style="padding: 20px 40px;">
              <div style="width:48px; height:4px; background:${color}; border-radius:4px;"></div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px;">
              <p style="margin:0 0 16px; color:#374151; font-size:16px; line-height:1.6;">
                Hello <strong>${sendReceiverName}</strong>,
              </p>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background:${light}; border-left:4px solid ${color}; border-radius:0 12px 12px 0; padding:20px 24px;">
                <p style="margin:0; color:#374151; font-size:15px; line-height:1.8;">
                  ${sendMessage}
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <a href="#" style="display:inline-block; background:linear-gradient(135deg, ${color} 0%, ${color}CC 100%); color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:14px 40px; border-radius:12px; letter-spacing:0.3px;">
                Visit ${sendCompanyName} &rarr;
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
                      <a href="#" style="color:${color}; font-size:12px; text-decoration:none; margin:0 8px;">Support</a>
                      <span style="color:#D1D5DB;">|</span>
                      <a href="#" style="color:${color}; font-size:12px; text-decoration:none; margin:0 8px;">Privacy Policy</a>
                      <span style="color:#D1D5DB;">|</span>
                      <a href="#" style="color:${color}; font-size:12px; text-decoration:none; margin:0 8px;">Terms</a>
                    </div>
                    <p style="margin:0; color:#9CA3AF; font-size:11px; line-height:1.6;">
                      &copy; ${year} ${sendCompanyName}. All rights reserved.<br/>
                      You received this email because you are a registered customer of ${sendCompanyName}.<br/>
                      This email and its contents are confidential and intended for the addressee only.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Email Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
};

const loginText = (sendReceiverName, textMessage) =>
  `Hello ${sendReceiverName},\n\n${textMessage}\n\nThank you.`;

const newsLetterEmail = (clientName) =>
  `<p>Hi ${clientName}, here you have today's news.</p>`;

module.exports = { newsLetterEmail, loginEmail, loginText };