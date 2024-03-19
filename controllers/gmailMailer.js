const nodemailer = require("nodemailer");
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