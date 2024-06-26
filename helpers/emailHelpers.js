const nodemailer = require("nodemailer");
const config = require("../config/config");

const transporter = nodemailer.createTransport(config.nodemailerConfig);

function sendVerificationEmail(email, verification_token) {
    const text = "Please verify your account by clicking on the link: " + config.mainURL + "/verifyEmail/" + email + "/" + verification_token;
    const html = "Please verify your account by clicking the following link: <br><br> <a href =" + config.mainURL + "/verifyEmail/" + email + "/" + verification_token + ">Confirm Email</a> <br><br> Thank you.";
    return transporter.sendMail({
        from: config.nodemailerFrom,
        to: email,
        subject: "Email Verification",
        text: text,
        html: html
    });
}

function sendPasswordRecoveryEmail(email, reset_token) {
    const text = "Please reset your password by clicking on the link: " + config.mainURL + "/ResetPassword/" + email + "/" + reset_token;
    const html = "Please reset your password by clicking the following link: <br><br> <a href =" + config.mainURL + "/ResetPassword/" + email + "/" + reset_token + ">Reset Password</a> <br><br> Thank you.";
    return transporter.sendMail({
        from: config.nodemailerFrom,
        to: email,
        subject: "Password Recovery",
        text: text,
        html: html
    });
}

module.exports = {
    sendVerificationEmail,
    sendPasswordRecoveryEmail
};
