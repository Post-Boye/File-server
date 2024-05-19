const express = require("express");
const app = express();
const httpObj = require("http");
const http = httpObj.createServer(app);

const mainURL = "http://localhost:3000";

// const mongodb = require("mongodb");
// const mongoClient = mongodb.MongoClient;
// const ObjectId = mongodb.ObjectId;

app.set("view engine", "ejs");

app.use("/public/css", express.static(__dirname + "/public/css" ));
app.use("/public/js", express.static(__dirname + "/public/js"));
app.use("/public/font-awesome-4.7.0", express.static(__dirname + "/public/font-awesome-4.7.0"));

const session = require("express-session");
app.use(session({
    secret: "secret key",
    resave: false,
    saveUninitialized: false
}));

app.use(function (request, result, next){
    request.mainURL = mainURL;
    request.isLogin = (typeof request.session.user !== "undefined");
    request.user = request.session.user;

    next();
});

// express formidable is used to parse the form data values
const formidable = require("express-formidable");
app.use(formidable());

// to encrypt/decrypt passwords
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const { Http2ServerRequest } = require("http2");

const nodemailerFrom = "boyejustice64@gmail.com";
let nodemailerObject = {
    service: "gmail",
    host : "smtp.gmail.com",
    port: 45,
    secure : true,
    auth : {
        user : "boyejustice64@gmail.com",
        pass : ""
    }
}

http.listen(3000,function(){
    console.log("server started at " + mainURL);

    // mongoClient.connect("mongodb://localhost:27017",{
    //     useNewUrlParser: true
    // }, function (error,client){
    //     database = client.db("File_server");
    //     console.log("Database connected.");

        app.get("/", function(request, result){
            result.render("index",{
                "request":request
            });
        });

        // show page to do the registration
        app.get("/Register", function (request, result) {
            result.render("Register", {
                "request": request
            });
        });

        // register the user
        app.post("/Register", async function (request, response) {
            let name = request.fields.name;
            let email = request.fields.email;
            let password = request.fields.password;
            let reset_token = "";
            let isVerified = true;
            let verification_token = new Date().getTime();
        
            let user = await database.collection("users").findOne({
                "email": email
            });

            if (user == null) {
                bcrypt.hash(password, 10, async function (error, hash) {
                    await database.collection("users").insertOne({
                        "name": name,
                        "email": email,
                        "password": hash,
                        "reset_token": reset_token,
                        "uploaded": [],
                        "sharedWithMe": [],
                        "isVerified": isVerified,
                        "verification_token": verification_token
                    }, async function (error, data) {

                        let transporter = nodemailer.createTransport(
                            nodemailerObject
                        );

                        let text = "Please verify your account by clicking on the link: " + mainURL + "/verifyEmail/" + email + "/" + verification_token;

                        let html = "Please verify your account by clicking the following link: <br><br> <a href =" + mainURL + "/" + verification_token + ">confirm Email</a> <br></br> Thank You.";
                        await transporter.sendMail({
                            from: nodemailerFrom,
                            to : email,
                            subject: "email verification",
                            text : text,
                            html : html},
                            function (error, info ) {
                                if(error){
                                    console.log(error);
                                }else{
                                        console.log("Email sent: " + info,
                                        response);
                                    }

                                    request.status = "success";
                                    request.message = "Signed up successfully. You can login now.";

                                    result.render("Register", {
                                        "request": request
                                    });
                                }
                                
                        )

    
                
                    

                        

                        
                        
                    });
                });
            } else {
                request.status = "error";
                request.message = "Email already exist.";

                result.render("Register", {
                    "request": request
                });
            }
        });

        app.get("/verifyEmail?:email/:email/:verification_token", async function (request, result){

            let email = request.params.email;
            let verification_token = request.params.verification_token;

            let user = await database.collection("users").findOne({
                $and: [{
                    "email" : email,
                }, { 
                    "verification_token": parseInt(verification_token)
                }]
            });

            if (user == null){
                request.status = "error";
                request.message = "Email does not exists. Or verification link expired";
                result.render("login", {
                    "request": request
                })
            }else{
                await database.collection("users").findOneAndUpdate({
                    $and: [{
                        "email" : email,
                    },{
                        "verification_token" : parseInt( verification_token)
                    }]
                    }, {
                        $set: {
                            "verification_token": "",
                            "isVerified": true
                        }
            
                });

                request.status = "success";
                request.message = "Account has been verified. Please try login. "; {
                    result.render("Login", {
                        "request": request
                    });

                }
            }


        });

        app.get("/Login", function(request,result){
            result.render("Login", {
                "request": request
            });
        });

        app.post("/Login",async function(request, result){
            let email = request.fields.email;
            let password = request.fields.password;

            let user = await database.collection("users").findOne({
                "email": email
            });

            if (user == null){
                request.status = "error";
                request.message = "Email does not exist. ";

                request.render("Login", {
                    "request": request
                });

                return false;
            }

            bcrypt.compare(password, user.password, function(error, isVerify){
                if (isVerify){
                    if(user.isVerify){
                        request.session.user = user;
                        result.redirect("/");

                        return false;
                    }

                    request.status = "error";
                    request.message = "kindly verify your email.";
                    result.render("Login", {
                        "request": request
                    });

                    return false;
                }

                request.status = "error"
                request.message = "Password is not correct.";
                result.render("Login", {
                    "request": request
                });
            }); 
            app.post("/SendRecoveryLink", async function(request, result){

                let email = request.fields.email;
                let user = await database.collection(users).findOne({
                    "email": email
                });

                if (user == null){
                    request.status = "error"
                    request.message = "Email does not exists.";

                    result.render("ForgotPassword", {
                        "request":request
                    });
                    return false;

                }
                let reset_token = new Date().getTime();

                await database.collection("users").findOneAndUpdate({
                    "email": email
                }, {
                    $set: {
                        "reset_token": reset_token
                    }
                });

                let transporter = nodemailer.createTransport(
                    nodemailerObject
                );

                let text = "Please reset  your password by clicking on the link: " + mainURL + "/ResetPassword/" + email + "/" + reset_token;

                let html = "Please verify your account by clicking the following link: <br><br> <a href =" + mainURL + "/ResetPassword/" + email + "/" + reset_token + ">reset password</a> <br></br> Thank You.";
                await transporter.sendMail({
                    from: nodemailerFrom,
                    to : email,
                    subject: "Reset Password",
                    text : text,
                    html : html},
                    function (error, info ) {
                        if(error){
                            console.log(error);
                        }else{
                                console.log("Email sent: " + info,
                                response);
                            }

                            request.status = "success";
                            request.message = "Email has been sent with the link to recover the password.";

                            result.render("ForgotPassword", {
                                "request": request 
                            });



            });
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



     });


        
       



    
});