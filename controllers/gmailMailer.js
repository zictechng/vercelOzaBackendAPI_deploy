const nodemailer = require("nodemailer");
// EMAIL_API_PASSWORD=b8e7e938d3ec8ea2448ffea6423ab17c  alumni password one
const gMailerTransport = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'ozaappng@gmail.com',
      pass: 'bbnxfsqirjrbtvxr'
    }
});

module.exports = gMailerTransport;