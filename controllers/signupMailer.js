const nodemailer = require("nodemailer");
const transporterMailer = nodemailer.createTransport({
    host: process.env.NAME_CHEAP_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.NAME_CHEAP_EMAIL_USER,
      pass: process.env.NAME_CHEAP_EMAIL_PASS
    }
});

module.exports = transporterMailer;