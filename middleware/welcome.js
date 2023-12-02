const newsLetterEmail = (clientName) => `<p>Hi ${clientName}, here you have today news.</p>`

const welcomeEmail = (clientName, username) =>
    
    `<p>Welcome ${clientName}, your username is ${username}.</p>`

module.exports = {newsLetterEmail, welcomeEmail}