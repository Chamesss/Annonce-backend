const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID, // ClientID
    process.env.GOOGLE_CLIENT_SECRET, // Client Secret
    "https://developers.google.com/oauthplayground" // Redirect URL
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRECH_TOKEN
});
const accessToken = oauth2Client.getAccessToken();

const smtpTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
         type: "OAuth2",
         user: process.env.MY_EMAIL, 
         clientId: process.env.GOOGLE_CLIENT_ID,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET,
         refreshToken: process.env.GOOGLE_REFRECH_TOKEN,
         accessToken: accessToken
    },
    tls: {
        rejectUnauthorized: false
    }
});

function sendEmail(email, message) {
    const mailOptions = {
        from: process.env.MY_EMAIL,
        to: email,
        subject: "Node.js Email with Secure OAuth",
        generateTextFromHTML: true,
        html: message
    };

    smtpTransport.sendMail(mailOptions, (error, response) => {
        error ? console.log(error) : console.log(response);
        smtpTransport.close();
    });
}

module.exports = { sendEmail };