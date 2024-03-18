const nodemailer = require("nodemailer");
// EMAIL_API_PASSWORD=b8e7e938d3ec8ea2448ffea6423ab17c  alumni password one
const transporterMailer = nodemailer.createTransport({
    host: process.env.NAME_CHEAP_HOST,
    port: 465,
    auth: {
      user: process.env.NAME_CHEAP_EMAIL_USER,
      pass: process.env.NAME_CHEAP_EMAIL_PASS
    }
});

module.exports = transporterMailer;