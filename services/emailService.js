const { mailTransporter, nodemailerTransporter, namecheapTransporter } = require("../controllers/emailSender");

async function sendEmail(options) {
  // ── Gate 1: Mailtrap API ──
  try {
    const response = await mailTransporter.send(options);
    console.log("✅ Email sent via Mailtrap:", response);
    return response;
  } catch (err) {
    console.error("⚠️ Mailtrap API failed:", err.response?.data || err.message);
  }

  // ── Gate 2: Namecheap SMTP ──
  try {
    const namecheapResponse = await namecheapTransporter.sendMail({
      from: `"${options.from.name}" <${options.from.email}>`,
      to: options.to.map((r) => r.email).join(","),
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log("✅ Email sent via Sendmoor Namecheap Server:", namecheapResponse.messageId);
    return namecheapResponse;
  } catch (namecheapErr) {
    console.error("⚠️ Sendmoor Namecheap SMTP failed:", namecheapErr.message);
  }

  // ── Gate 3: Gmail fallback ──
  try {
    const smtpResponse = await nodemailerTransporter.sendMail({
      from: `"${options.from.name}" <${options.from.email}>`,
      to: options.to.map((r) => r.email).join(","),
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log("✅ Email sent via Gmail fallback:", smtpResponse.messageId);
    return smtpResponse;
  } catch (smtpErr) {
    console.error("❌ All email gates failed:", smtpErr.message);
    throw smtpErr;
  }
}

module.exports = sendEmail;