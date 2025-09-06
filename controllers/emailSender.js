const { MailtrapClient } = require("mailtrap");
const nodemailer = require("nodemailer");

const mailTransporter = new MailtrapClient({
  token: process.env.EMAIL_API_PASSWORD,
});

const nodemailerTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = { mailTransporter, nodemailerTransporter };