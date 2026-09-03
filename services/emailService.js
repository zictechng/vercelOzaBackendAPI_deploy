const { mailTransporter, nodemailerTransporter } = require("../controllers/emailSender");

async function sendEmail(options) {
    try {
      // Try Mailtrap API first
      const response = await mailTransporter.send(options);
      console.log("✅ Email sent via Mailtrap:", response);
      return response;
    } catch (err) {
      console.error("⚠️ Mailtrap API failed:", err.response?.data || err.message);
  
      // Fallback to Nodemailer SMTP
      try {
        const smtpResponse = await nodemailerTransporter.sendMail({
          from: `${options.from.name} ${options.from.email}`,
          to: options.to.map((r) => r.email).join(","),
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        console.log("✅ Email sent via Nodemailer fallback:", smtpResponse.messageId);
        return smtpResponse;
      } catch (smtpErr) {
        console.error("❌ Fallback SMTP also failed:", smtpErr.message);
        throw smtpErr;
      }
    }
  }
  
  module.exports = sendEmail;


  
