const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER_KEY,
      pass: process.env.EMAIL_API_PASSWORD
    }
});

module.exports = transporter;