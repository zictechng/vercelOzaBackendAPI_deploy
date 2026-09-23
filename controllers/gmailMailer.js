const nodemailer = require("nodemailer");
const gMailerTransport = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'benfiverruk@gmail.com',
      pass: 'bwyvxmgfuhhfsdcr'
    }
});

module.exports = gMailerTransport;