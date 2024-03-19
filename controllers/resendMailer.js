const nodemailer = require("nodemailer");
// EMAIL_API_PASSWORD=b8e7e938d3ec8ea2448ffea6423ab17c  alumni password one
const resendMailerTransport = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    auth: {
      user: 'resend',
      pass: 're_8qWnAKcM_J9A5Fj8u1sind69PpVtmCefP'
    }
});

module.exports = resendMailerTransport;