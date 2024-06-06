const express = require("express");
const app = express();
const httpObj = require("http");
const http = httpObj.createServer(app);

const mainURL = "http://localhost:3000";

const mongoose = require('mongoose');
const session = require("express-session");
const formidable = require("express-formidable");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

app.set("view engine", "ejs");

app.use("/public/css", express.static(__dirname + "/public/css"));
app.use("/public/js", express.static(__dirname + "/public/js"));
app.use("/public/font-awesome-4.7.0", express.static(__dirname + "/public/font-awesome-4.7.0"));

app.use(session({
    secret: "secret key",
    resave: false,
    saveUninitialized: false
}));

app.use(function (request, result, next) {
    request.mainURL = mainURL;
    request.isLogin = (typeof request.session.user !== "undefined");
    request.user = request.session.user;

    next();
});

app.use(formidable());

const nodemailerFrom = "boyejustice64@gmail.com";
let nodemailerObject = {
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465, // Corrected port for secure connection
    secure: true,
    auth: {
        user: "boyejustice64@gmail.com",
        pass: "Nanayaa21@" // Ensure this is an app-specific password if 2FA is enabled
    }
};

// Use a connection string that includes the database name
mongoose.connect("mongodb+srv://darkoboyejustice:219Q1KlDHfuwbv92@cluster0.jtds8hf.mongodb.net/File_server", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true // Ensures TLS is used for the connection
}).then(() => {
    console.log("Database connected.");

    const userSchema = new mongoose.Schema({
        name: String,
        email: String,
        password: String,
        reset_token: String,
        uploaded: Array,
        sharedWithMe: Array,
        isVerified: Boolean,
        verification_token: String
    });

    const User = mongoose.model('User', userSchema);

    app.get("/", function (request, result) {
        result.render("index", {
            "request": request
        });
    });

    app.get("/Register", function (request, result) {
        result.render("Register", {
            "request": request
        });
    });

    app.post("/Register", async function (request, result) {
        let { name, email, password } = request.fields;
        let reset_token = "";
        let isVerified = true;
        let verification_token = new Date().getTime();

        let user = await User.findOne({ email });

        if (user == null) {
            bcrypt.hash(password, 10, async function (error, hash) {
                let newUser = new User({
                    name,
                    email,
                    password: hash,
                    reset_token,
                    uploaded: [],
                    sharedWithMe: [],
                    isVerified,
                    verification_token
                });

                await newUser.save();

                let transporter = nodemailer.createTransport(nodemailerObject);

                let text = `Please verify your account by clicking on the link: ${mainURL}/verifyEmail/${email}/${verification_token}`;
                let html = `Please verify your account by clicking the following link: <br><br> <a href="${mainURL}/verifyEmail/${email}/${verification_token}">Confirm Email</a> <br><br> Thank you.`;

                await transporter.sendMail({
                    from: nodemailerFrom,
                    to: email,
                    subject: "Email verification",
                    text,
                    html
                }, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log("Email sent: " + info.response);
                        request.status = "success";
                        request.message = "Signed up successfully. You can log in now.";
                        result.render("Register", {
                            "request": request
                        });
                    }
                });
            });
        } else {
            request.status = "error";
            request.message = "Email already exists.";
            result.render("Register", {
                "request": request
            });
        }
    });

    app.get("/verifyEmail/:email/:verification_token", async function (request, result) {
        let { email, verification_token } = request.params;

        let user = await User.findOne({
            email,
            verification_token: parseInt(verification_token)
        });

        if (user == null) {
            request.status = "error";
            request.message = "Email does not exist or verification link expired.";
            result.render("Login", {
                "request": request
            });
        } else {
            user.verification_token = "";
            user.isVerified = true;
            await user.save();

            request.status = "success";
            request.message = "Account has been verified. Please log in.";
            result.render("Login", {
                "request": request
            });
        }
    });

    app.get("/Login", function (request, result) {
        result.render("Login", {
            "request": request
        });
    });

    app.post("/Login", async function (request, result) {
        let { email, password } = request.fields;

        let user = await User.findOne({
            email: email
        });

        if (user == null) {
            request.status = "error";
            request.message = "Email does not exist.";

            result.render("Login", {
                "request": request
            });

            return false;
        }

        bcrypt.compare(password, user.password, function (error, isVerify) {
            if (isVerify) {
                if (user.isVerified) {
                    request.session.user = user;
                    result.redirect("/");

                    return false;
                }

                request.status = "error";
                request.message = "Kindly verify your email.";
                result.render("Login", {
                    "request": request
                });

                return false;
            }

            request.status = "error";
            request.message = "Password is not correct.";
            result.render("Login", {
                "request": request
            });
        });

        
    });
    app.get("/ForgotPassword",function(request,result){
        result.render("ForgotPassword", {
            "request":request
        })
    })

    app.post("/SendRecoveryLink", async function(request, result) {
        try {
            let email = request.fields.email;
            let user = await User.findOne({ email });
    
            if (user == null) {
                request.status = "error";
                request.message = "Email does not exist.";
    
                result.render("ForgotPassword", {
                    "request": request
                });
                return false;
            }
    
            let reset_token = new Date().getTime();
    
            user.reset_token = reset_token;
            await user.save();
    
            let transporter = nodemailer.createTransport(nodemailerObject);
    
            let text = `Please reset your password by clicking on the link: ${mainURL}/ResetPassword/${email}/${reset_token}`;
            let html = `Please reset your password by clicking the following link: <br><br> <a href="${mainURL}/ResetPassword/${email}/${reset_token}">Reset Password</a> <br><br> Thank you.`;
    
            await transporter.sendMail({
                from: nodemailerFrom,
                to: email,
                subject: "Reset Password",
                text,
                html
            }, function(error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log("Email sent: " + info.response);
                    request.status = "success";
                    request.message = "Email has been sent with the link to recover the password.";
    
                    result.render("ForgotPassword", {
                        "request": request
                    });
                }
            });
        } catch (error) {
            console.error("Error in /SendRecoveryLink route:", error);
            result.status(500).send("Internal Server Error");
        }
    });
    app.get("/ResetPassword/:email/:reset_token",async function(request,response){
        let email = request.params.email;
        let reset_token = request.params.reset_token;

        let user = await database.collection("users").findOne({
            $and: [{
                "email": email
            }, {
                "reset_token": parseInt(reset_token)
            }]
        });

        if (user == null){
            request.status = "error";
            request.message = "Link is expired.";
            result.render("Error",{
                "request": request
            });
            return false;
        }

        result.render("ResetPassword",{
            "request": request,
            "email": email,
            "reset_token": reset_token
        });


    });
    app.post("/Resetpassword",async function(request,result){
        let email = request.fields.email;
        let reset_token = request.fields.reset_token;
        let new_password = request.fields.new_password;
        let confirm_password = request.fields.confirm_password;

        if (new_password != confirm_password) {
            request.status = "error";
            request.message = "Password does not match.";

            request.render("ResetPassword", {
                "request": request,
                "email": email,
                "reset_token": reset_token
            });

            return false;
        }

        let user = await database.collection("users").findOne({
            $and: [{
                "email": email,
            },{
                "reset_token": parseInt(reset_token)
            }]
        });

        if (user == null){
            request.status = "error"
            request.message = "Email does not exists. Or recovery link is expired.";

            result.render("ResetPassword", {
                "request": request,
                "email": email,
                "reset_token": reset_token
            });

            return false;
        }

        bcrypt.hash(new_password, 10, async function(error,hash){
            await database.collection("users").findOneAndUpdate({
                $and: [{
                    "email": email,

                }, {
                    "reset_token": parseInt(reset_token)
                }]
            }, {
                $set: {
                    "reset_token": "",
                    "password": harsh
                }
            });

            request.status = "success";
            request.message = "Password has been changed. Please try login again.";

            result.render("Login", {
                "request": request
            });
        });



    });

    app.get("/Logout", function(request,result){
        request.session.destroy();
        result.redirect("/");
    });
    

    http.listen(3000, function () {
        console.log("Server started at " + mainURL);
    });
}).catch(error => {
    console.error("Database connection error:", error);
});
