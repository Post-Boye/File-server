const express = require("express");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { sendVerificationEmail, sendPasswordRecoveryEmail } = require("../helpers/emailHelpers");
const config = require("../config/config");

const router = express.Router();

router.post("/Register", async (request, response) => {
    const { name, email, password } = request.fields;
    const verification_token = new Date().getTime();

    const user = await database.collection("users").findOne({ "email": email });

    if (!user) {
        bcrypt.hash(password, 10, async (error, hash) => {
            await database.collection("users").insertOne({
                name,
                email,
                password: hash,
                reset_token: "",
                verification_token,
                isVerified: false,
                uploaded: [],
                sharedWithMe: []
            });
            sendVerificationEmail(email, verification_token);
            response.json({ "status": "success", "message": "Signed up successfully. Please verify your email." });
        });
    } else {
        response.json({ "status": "error", "message": "Email already exists." });
    }
});

router.get("/verifyEmail/:email/:verification_token", async (request, response) => {
    const { email, verification_token } = request.params;

    const user = await database.collection("users").findOne({
        email,
        verification_token: parseInt(verification_token)
    });

    if (user) {
        await database.collection("users").updateOne({ email }, {
            $set: { isVerified: true }
        });
        response.redirect("/Login");
    } else {
        response.json({ "status": "error", "message": "Email verification token expired." });
    }
});

router.post("/Login", async (request, response) => {
    const { email, password } = request.fields;

    const user = await database.collection("users").findOne({ email });

    if (user) {
        if (!user.isVerified) {
            response.json({ "status": "error", "message": "Kindly verify your email." });
            return;
        }

        bcrypt.compare(password, user.password, (error, isVerify) => {
            if (isVerify) {
                request.session.user = user;
                response.json({ "status": "success", "message": "Login successfully.", "user": user });
            } else {
                response.json({ "status": "error", "message": "Password is not correct." });
            }
        });
    } else {
        response.json({ "status": "error", "message": "Email does not exist." });
    }
});

router.get("/Logout", (request, response) => {
    request.session.destroy();
    response.redirect("/");
});

router.post("/ForgotPassword", async (request, response) => {
    const { email } = request.fields;

    const user = await database.collection("users").findOne({ email });

    if (user) {
        const reset_token = new Date().getTime();

        await database.collection("users").updateOne({ email }, {
            $set: { reset_token }
        });

        sendPasswordRecoveryEmail(email, reset_token);
        response.json({ "status": "success", "message": "Email sent to reset password." });
    } else {
        response.json({ "status": "error", "message": "Email does not exist." });
    }
});

router.post("/ResetPassword", async (request, response) => {
    const { email, token, password } = request.fields;

    const user = await database.collection("users").findOne({
        email,
        reset_token: parseInt(token)
    });

    if (user) {
        bcrypt.hash(password, 10, async (error, hash) => {
            await database.collection("users").updateOne({ email }, {
                $set: { password: hash, reset_token: "" }
            });
            response.json({ "status": "success", "message": "Password has been changed." });
        });
    } else {
        response.json({ "status": "error", "message": "Link expired." });
    }
});

module.exports = router;
