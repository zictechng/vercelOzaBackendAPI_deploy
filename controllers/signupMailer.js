
const nodemailer = require("nodemailer");
const transporterMailer = nodemailer.createTransport({
    host: 'business79.web-hosting.com',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@sendmoor.com',
      pass: 'e_k1uoq^y[ddOZ=f'
    }
});

module.exports = transporterMailer;
