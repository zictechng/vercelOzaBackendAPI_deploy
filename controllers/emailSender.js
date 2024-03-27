const {MailtrapClient} = require('mailtrap')

// const TOKEN = process.env.EMAIL_API_PASSWORD;
// const client = new MailtrapClient({ token: TOKEN });

const mailTransporter = MailtrapClient.createTransport({
    token: process.env.EMAIL_API_PASSWORD
});

module.exports = mailTransporter;