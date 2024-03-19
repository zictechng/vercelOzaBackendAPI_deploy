const nodemailer = require("nodemailer");
const transporterMailer = nodemailer.createTransport({
    host: 'premium75.web-hosting.com',
    port: 465,
    secure: true,
    auth: {
      user: 'ozaapp@zictech-ng.com',
      pass: 'RvP4rSl4IkmU'
    }
});

module.exports = transporterMailer;