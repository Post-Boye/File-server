const express = require("express");
const app = express();
const httpObj = require("http");
const http = httpObj.createServer(app);

const mainURL = "http://localhost:3000";

const mongodb = require('mongodb');
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

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
};

function recursiveGetFolder(files, _id){
    var singleFile = null;

    for (var a = 0; a < files.length; a++){
        const file = files[a];

        if(file.type == "folder"){
            if (file._id == _id){
                return file;
            }

            if(file.files.length > 0){
                singleFile = recursiveGetFolder(file.files, _id);

                if(singleFile != null){
                    return singleFile
                }
            }
        }
    }
}

function getUpdatedArray(arr, _id, uploadedObj){
    for (var a = 0; a < arr.length; a++){
        if (arr[a].type == "folder"){
            if (arr[a]._id == _id){
                arr[a].files.push(uploadedObj);
                arr[a]._id = ObjectId(arr[a]._id);
            }

            if (arr[a].files.length > 0){
                arr[a]._id = ObjectId(arr[a]._id);
                getUpdatedArray(arr[a].files,_id, uploadedObj);
            }
        }
    }

    return arr;
}



http.listen(3000,function(){
    console.log("server started at " + mainURL);

    mongoClient.connect("mongodb+srv://postboyemalone:HHYhMQCZvO9Fvq6d@malone2.4ndmjtd.mongodb.net/",{
        useNewUrlParser: true
    }, function (error,client){
        database = client.db("File_server");
        console.log("Database connected.");
       
        app.post("/UploadFile", async function (request, result) {
            if (request.session.user){
                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)

                });
                if (request.files.file.size > 0) {
                    const _id = request.fields._id;
                    var uploadedObj ={
                        "_id": ObjectId(),
                        "size": request.files.file.size, // in bytes
                        "name": request.files.file.name,
                        "type": request.files.file.type,
                       "filePath": "",
                       "createdAt": new Date().getTime()
                    };

                    var filePath = ""
                    if (_id == ""){
                        filePath = "public/uploads/" + user.email + "/" + new Date().getTime() + "-" + request.files.file.name;
                        uploadedObj.filePath = filePath;
        
                        if (!fileSystem.existsSync("public/uploads/" + user.email)){
                            fileSystem.mkdirSync("public/uploads/" + user.email);
                        }
                        // Read the file
                        fileSystem.readFile(request.files.file.path, function (err, data){
                            if (err) throw err;
                            console.log('File read!');

                            // Write the file
                            fileSystem.writeFile(filePath, data, async function (err){
                                if (err) throw err;
                                console.log('File written!');
                                await database.collection("users").updateOne({
                                    "_id": ObjectId(request.session.user._id)
                                }, {
                                    $push: {
                                        "uploaded": uploadedObj
                                    }

                                });

                                result.redirect("/MyUploads/" + _id);
                    
                            });

                            // Delete the file
                            fileSystem.unlink(request.files.file.path, function (err){
                                if (err) throw err;
                                console.log('File deleted!');
                            });

                        });

                    } else {
                        var folderObj = await recursiveGetFolder(user.uploaded, _id);

                        uploadedObj.filePath = folderObj.filePath + "/" + request.files.file.name;

                        var updatedArray = await getUpdatedArray(user.uploaded, _id, uploadedObj);
                        fileSystem.readFile(request.files.file.path, function (err, data){
                            if (err) throw err;
                            console.log('File read!');

                            fileSystem.writeFile(uploadedObj.filePath, data, async function (err){
                                if (err) throw err;
                                console.log('File written!');

                                for (var a = 0; a < updatedArray.length; a++ ){
                                    updatedArray[a]._id = ObjectId(updatedArray[a]._id); 
                                }
                                await database.collection("users").updateOne({
                                    "_id": ObjectId(request.session.user._id)
                                }, {
                                    $set: {
                                        "uploaded": updatedArray
                                    }
                                });

                                result.redirect("/MyUploads/" + _id);
                            });

                            // Delete the file
                            fileSystem.unlink(request.files.file.path, function (err){
                                if (err) throw err;
                                console.log('File deleted!');
                            });

                        });

                    }

                } else {
                    request.status = "error";
                    request.message = "Please select valid image.";

                    result.render("MyUploads", {
                        "request": request
                    });
                }

                return false;
            }

            result.redirect("/Login");
        });

      

        app.post("/CreateFolder",async function(request,result){
            const name = request.fields.name
            const _id = request.fields._id;

            if (request.session.user){
                var user = await database.collection("users").findOne({
                    "_id": ObjectId(request.session.user._id)
                });
                var uploadedObj = {
                    "_id": ObjectId(),
                    "type": "folder",
                    "folderName": name,
                    "files": [],
                    "folderPath": "",
                    "createAt": new Date().getTime()
                };

                var folderPath = ""  
                var updatedArray = [];

                if (_id == ""){
                    folderPath = "public/uploads/" + user.email + "/" + name;
                    uploadedObj.folderPath = folderPath;

                    if(!FileSystem.existsSync("public/uploads/" + user.email)){
                        FileSystem.mkdirSync("public/uploads/" + user.email);
                    }else{
                        var folderObj = await recursiveGetFolder(user.uploaded, _id);
                        uploadedObj.folderPath = folderObj.folderPath + "/" + name;
                        updatedArray = await getUpdatedArray(user.uploaded, _id, uploadedObj);
                    }

                    if (uploadedObj.folderPath == ""){
                        request.session.status == "error"
                        request.session.message = "Folder name must not be empty.";

                        result.redirect("/MyUploads");
                        return false
                    }

                    if (FileSystem.existsSync(uploadedObj.folderPath)){
                        request.session.status = "error";
                        request.session.message = "folder with the same name already exists.";
                        result.redirect("/Myuploads");
                        return false;
                    }

                    FileSystem.mkdirSync(uploadedObj.folderPath);

                    if(_id = ""){
                        await database.collection("users").updateOne({
                            "_id": ObjectId(request.session.user._id)
                        }, {
                            $push: {
                                "uploaded": uploadedObj
                            }
                        });
                    } else{
                        for (var a = 0; a < updatedArray.length; a++ ){
                            updatedArray[a]._id = ObjectId(updatedArray[a]._id)
                        }
                        
                        await database.collection("users").updateOne({
                            "_id": ObjectId(request.session.user._id)
                        }, {
                            $set: {
                                "uploaded": updatedArray
                            
                            }
                        });
                    }

                    result.redirect("/My Uploads/" + _id);
                    return false;
                }
                result.redirect("/Login");
            }
        })

        app.post("/MyUploads/:_id?", async function(request, result){
            const _id = request.params._id;

        if (request.sesseion.user){
            let user = await database.collection("users").findOne({
                "_id": ObjectId(request.session.user._id)
            });

            var uploaded = null;
            var folderName = "";
            var createdAt = "";
            if (typeof _id == "undefined"){
                uploaded = user.uploaded;

            }else{
                var folderObj = await recursiveGetFolder(user.uploaded, _id);

                if (folderObj == null){
                    request.status = 'error';
                    request.message = "Folder not found.";
                    result.render("MyUploads", {
                        "request": request
                    });
                    return false 

                }
                uploaded = folderObj.files;
                folderName = folderObj.folderName;
                createdAt = folderObj.createdAt;
            }

            if (uploaded == null){
                request.status = "error";
                request.message = "Directory not found.";
                result.render("MyUploads", {
                    "request": request
                });

                return false;
            }
            result.render("MyUploads", {
                "request" : request,
                "uploaded" : uploaded,
                "_id": _id,
                "folderName": folderName,
                "createArt" : createdAt
            });
    
            return false;

            
        }

        result.redirect("/Login")

        
        });

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

     });


    })});