const nodemailer = require("nodemailer");
const transporterMailer = nodemailer.createTransport({
    host: 'premium75.web-hosting.com',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@ozaapp.com',
      pass: 'KK&Z1FLg$Aqg'
    }
});

module.exports = transporterMailer;
