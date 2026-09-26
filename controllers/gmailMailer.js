const nodemailer = require("nodemailer");
const gMailerTransport = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'sendmoorr@gmail.com',
      pass: 'teaksxunyyzqlbtg'
    }
});

module.exports = gMailerTransport;