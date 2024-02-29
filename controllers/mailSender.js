const nodemailer = require("nodemailer");
// EMAIL_API_PASSWORD=b8e7e938d3ec8ea2448ffea6423ab17c  alumni password one
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER_KEY,
      pass: process.env.EMAIL_API_PASSWORD
    }
});

module.exports = transporter;