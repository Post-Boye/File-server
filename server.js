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
const retry = require('async-retry');
const { ObjectId } = require('mongodb');

app.set("view engine", "ejs");

app.use("/public/css", express.static(__dirname + "/public/css"));
app.use("/public/js", express.static(__dirname + "/public/js"));
app.use("/public/font-awesome-4.7.0", express.static(__dirname + "/public/font-awesome-4.7.0"));

app.use(session({
    secret: "secret key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

async function sendRecoveryLink(email, reset_token) {
    let transporter = nodemailer.createTransport(nodemailerObject);
    let text = `Please reset your password by clicking on the link: ${mainURL}/ResetPassword/${email}/${reset_token}`;
    let html = `Please reset your password by clicking the following link: <br><br> <a href="${mainURL}/ResetPassword/${email}/${reset_token}">Reset Password</a> <br><br> Thank you.`;

    await retry(async () => {
        await transporter.sendMail({
            from: nodemailerFrom,
            to: email,
            subject: "Reset Password",
            text,
            html
        });
    }, {
        retries: 5,
        onRetry: (error) => {
            console.log("Retrying due to error:", error);
        }
    });
}

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
    port: 465,
    secure: true,
    auth: {
        user: "boyejustice64@gmail.com",
        pass: "athr qhel fgvf stfo" // Ensure this is an app-specific password if 2FA is enabled
    }
};

var FileSystem = require("fs");
var rimraf = require("rimraf");

function recursiveGetFolder(files, _id) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        const file = files[a];

        if (file.type == "folder") {
            if (file._id == _id) {
                return file;
            }

            if (file.files.length > 0) {
                singleFile = recursiveGetFolder(file.files, _id);

                if (singleFile != null) {
                    return singleFile;
                }
            }
        }
    }
}

function getUpdatedArray(arr, _id, uploadedObj) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].type == "folder") {
            if (arr[a]._id == _id) {
                arr[a].files.push(uploadedObj);
                arr[a]._id = new ObjectId(arr[a]._id);
            }

            if (arr[a].files.length > 0) {
                arr[a]._id = new ObjectId(arr[a]._id);
                getUpdatedArray(arr[a].files, _id, uploadedObj);
            }
        }
    }

    return arr;
}

function removeFileReturnUpdated(arr, _id) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].type != "folder" && arr[a]._id == _id) {
            try {
                if (arr[a].filePath) {
                    FileSystem.unlinkSync(arr[a].filePath);
                }
            } catch (exp) { }

            arr.splice(a, 1);
            break;
        }

        if (arr[a].type == "folder" && arr[a].files.length > 0) {
            arr[a]._id = new ObjectId(arr[a]._id);
            removeFileReturnUpdated(arr[a].files, _id);
        }
    }

    return arr;
}

function recursiveGetFile(files, _id) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        const file = files[a];

        if (file.type != "folder") {
            if (file._id == _id) {
                return file;
            }
        }

        if (file.type == "folder" && file.files.length > 0) {
            singleFile = recursiveGetFile(file.files, _id);
            if (singleFile != null) {
                return singleFile;
            }
        }
    }
}

function recursiveGetSharedFolder(files, _id) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        var file = (typeof files[a].file === "undefined") ? files[a] : files[a].file;

        if (file.type == "folder") {
            if (file._id == _id) {
                return file;
            }

            if (file.files.length > 0) {
                singleFile = recursiveGetSharedFolder(file.files, _id);
                if (singleFile != null) {
                    return singleFile;
                }
            }
        }
    }
}

function removeFolderReturnUpdated(arr, _id) {
    for (var a = 0; a < arr.length; a++) {
        if (arr[a].type == "folder") {
            if (arr[a]._id == _id) {
                if (arr[a].folderPath) {
                    rimraf(arr[a].folderPath, function () { });
                }
                arr.splice(a, 1);
                break;
            }
            if (arr[a].files.length > 0) {
                arr[a]._id = new ObjectId(arr[a]._id);
                removeFolderReturnUpdated(arr[a].files, _id);
            }
        }
    }
    return arr;
}

function removeSharedFolderReturnUpdated(arr, _id) {
    for (var a = 0; a < arr.length; a++) {
        var file = (typeof arr[a].file === "undefined") ? arr[a] : arr[a].file;
        if (file.type == "folder") {
            if (file._id == _id) {
                arr.splice(a, 1);
                break;
            }

            if (file.files.length > 0) {
                file._id = new ObjectId(file._id);
                removeFolderReturnUpdated(file.files, _id);
            }
        }
    }
    return arr;
}

function removeSharedFileReturnUpdated(arr, _id) {
    for (var a = 0; a < arr.length; a++) {
        var file = (typeof arr[a].file === "undefined") ? arr[a] : arr[a].file;

        if (file.type != "folder" && file._id == _id) {
            arr.splice(a, 1);
            break;
        }

        if (file.type == "folder" && file.files.length > 0) {
            arr[a]._id = new ObjectId(arr[a]._id);
            removeSharedFileReturnUpdated(file.files, _id);
        }
    }

    return arr;
}

function recursiveGetSharedFile(files, _id) {
    var singleFile = null;

    for (var a = 0; a < files.length; a++) {
        var file = (typeof files[a].file === "undefined") ? files[a] : files[a].file;

        if (file.type != "folder") {
            if (file._id == _id) {
                return file;
            }
        }

        if (file.type == "folder" && file.files.length > 0) {
            singleFile = recursiveGetSharedFile(file.files, _id);
            if (singleFile != null) {
                return singleFile;
            }
        }
    }
}

mongoose.connect("mongodb+srv://darkoboyejustice:219Q1KlDHfuwbv92@cluster0.jtds8hf.mongodb.net/File_server", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    tls: true
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

    app.post("/DownloadFile", async function (request, result) {
        const _id = request.fields._id;

        var link = await User.findOne({
            "file._id": new ObjectId(_id)
        });

        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });

            var fileUploaded = await recursiveGetFile(user.uploaded, _id);
            var fileShared = await recursiveGetFile(user.shareWithMe, _id);

            if (fileUploaded == null && fileShared == null) {
                result.json({
                    "status": "error",
                    "message": "File is neither uploaded nor shared with you."
                });
                return false;
            }

            var file = (fileUploaded == null) ? fileShared : fileUploaded;

            if (file.filePath) {
                FileSystem.readFile(file.filePath, function (error, data) {
                    result.json({
                        "status": "success",
                        "message": "Data has been fetched.",
                        "arrayBuffer": data,
                        "fileType": file.type,
                        "fileName": file.name
                    });
                });
            } else {
                result.json({
                    "status": "error",
                    "message": "File path is invalid."
                });
            }
            return false;
        }

        result.json({
            "status": "error",
            "message": "Please login to perform this action."
        });
        return false;
    });

    app.post("/DeleteSharedFile", async function (request, result) {
        const _id = request.fields._id;

        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });
            var updatedArray = await removeSharedFolderReturnUpdated(user.sharedWithMe, _id);
            for (var a = 0; a < updatedArray.length; a++) {
                updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
            }

            await User.updateOne({
                "_id": new ObjectId(request.session.user._id)
            }, {
                $set: {
                    "sharedWithMe": updatedArray
                }
            });
            const backURL = request.header('Referer') || '/';
            result.redirect(backURL);
            return false;
        }
        result.redirect("/Login");
    });

    app.post("/DeleteSharedDirectory", async function (request, result) {
        const _id = request.fields._id;

        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });
            var updatedArray = await removeFolderReturnUpdated(user.shareWithMe, _id);
            for (var a = 0; a < updatedArray.length; a++) {
                updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
            }

            await User.updateOne({
                "_id": new ObjectId(request.session.user._id)
            }, {
                $set: {
                    "sharedWithMe": updatedArray
                }
            });

            const backURL = request.header('Referer') || '/';
            result.redirect(backURL);
            return false;
        }
        result.redirect("/Login");
    });

    app.get("/SharedWithMe/:_id?", async function (request, result) {
        const _id = request.params._id;
        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });
            var files = null;
            var folderName = "";
            if (typeof _id == "undefined") {
                files = user.shareWithMe;
            } else {
                var folderObj = await recursiveGetSharedFolder(user.shareWithMe, _id);

                if (folderObj == null) {
                    request.status = "error";
                    request.message = "Folder not found.";
                    result.render("Error", {
                        "request": request
                    });
                    return false;
                }
                files = folderObj.files;
                folderName = folderObj.folderName;
            }
            if (files == null) {
                request.status = "error";
                request.message = "Directory not found.";
                result.render("Error", {
                    "request": request
                });
                return false;
            }
            result.render("SharedWithMe", {
                "request": request,
                "files": files,
                "_id": _id,
                "folderName": folderName
            });
            return false;
        }
        result.redirect("/Login");
    });

    app.post("/RemoveSharedAccess", async function (request, result) {
        const _id = request.fields._id;

        if (request.session.user) {
            const user = await User.findOne({
                $and: [{
                    "sharedWithMe._id": new ObjectId(_id)
                }, {
                    "sharedWithMe.sharedBy._id": new ObjectId(request.session.user._id)
                }]
            });
            for (var a = 0; a < user.shareWithMe.length; a++) {
                if (user.shareWithMe[a]._id == _id) {
                    user.shareWithMe.splice(a, 1);
                }
            }

            await User.findOneAndUpdate({
                $and: [{
                    "sharedWithMe._id": new ObjectId(_id)
                }, {
                    "sharedWithMe.sharedBy._id": new ObjectId(request.session.user._id)
                }]
            }, {
                $set: {
                    "sharedWithMe": user.shareWithMe
                }
            });

            request.session.status = "success";
            request.session.message = "shared access has been removed.";

            const backURL = request.header('Referer') || '/';
            result.redirect(backURL);
            return false;
        }
        result.redirect("/Login");
    });

    app.post("/GetFileSharedWith", async function (request, result) {
        const _id = request.fields._id;

        if (request.session.user) {
            const tempUsers = await User.find({
                $and: [{
                    "sharedWithMe.file._id": new ObjectId(_id)
                }, {
                    "sharedWithMe.sharedBy._id": new ObjectId(request.session.user._id)
                }]
            }).toArray();

            var users = [];
            for (a = 0; a < tempUsers.length; a++) {
                var sharedObj = null;
                for (var b = 0; b < tempUsers[a].shareWithMe.length; b++) {
                    if (tempUsers[a].shareWithMe[b].file._id == _id) {
                        sharedObj = {
                            "_id": tempUsers[a].shareWithMe[b]._id,
                            "sharedAt": tempUsers[a].shareWithMe[b].createdAt,
                        };
                    }
                }
                users.push({
                    "_id": tempUsers[a]._id,
                    "name": tempUsers[a].name,
                    "email": tempUsers[a].email,
                    "sharedObj": sharedObj
                });
            }
            result.json({
                "status": "success",
                "message": "Record has been fetched.",
                "users": users
            });
            return false;
        }
        result.json({
            "status": "error",
            "message": "Please login to perform this action."
        });
    });

    app.post("/Share", async function (request, result) {
        const _id = request.fields._id;
        const type = request.fields.type;
        const email = request.fields.email;

        if (request.session.user) {
            var user = await User.findOne({
                "email": email
            });

            if (user == null) {
                request.session.status = "error";
                request.session.message = "User " + email + " does not exist.";
                result.redirect("/MyUploads");
                return false;
            }

            if (!user.isVerified) {
                request.session.status = "error";
                request.session.message = "User " + user.name + " account is not verified.";
                result.redirect("/MyUploads");
                return false;
            }

            var me = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });

            var file = null;

            if (type == "folder") {
                file = await recursiveGetFolder(me.uploaded, _id);
            } else {
                file = await recursiveGetFile(me.uploaded, _id);
            }

            if (file == null) {
                request.session.status = "error";
                request.session.message = "File does not exist.";
                result.redirect("/MyUploads");
                return false;
            }

            file._id = new ObjectId(file._id);

            const sharedBy = me;
            await User.findOneAndUpdate({
                "_id": user._id
            }, {
                $push: {
                    "sharedWithMe": {
                        "_id": new ObjectId(),
                        "file": file,
                        "sharedBy": {
                            "_id": new ObjectId(sharedBy._id),
                            "name": sharedBy.name,
                            "email": sharedBy.email
                        },
                        "createdAt": new Date().getTime()
                    }
                }
            });

            request.session.status = "success";
            request.session.message = "File has been shared with " + user.name + ".";
            const backURL = request.header("Referer") || "/";
            result.redirect(backURL);
        } else {
            result.redirect("/Login");
        }
    });

    app.post("/GetUser", async function (request, result) {
        const email = request.fields.email;

        if (request.session.user) {
            var user = await User.findOne({
                email: email
            });

            if (user == null) {
                result.json({
                    "status": "error",
                    "message": "User " + email + " does not exist."
                });
                return false;
            }
            if (!user.isVerified) {
                result.json({
                    "status": "error",
                    "message": "User " + user.name + " account is not verified."
                });
                return false;
            }

            result.json({
                "status": "success",
                "message": "Data has been fetched.",
                "user": {
                    "_id": user._id,
                    "name": user.name,
                    "email": user.email
                }
            });
            return false;
        }
        result.json({
            "status": "error",
            "message": "Login to perform this action."
        });
        return false;
    });

    app.post("/DeleteDirectory", async function (request, result) {
        const _id = request.fields._id;

        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });
            var updatedArray = await removeFolderReturnUpdated(user.uploaded, _id);

            for (var a = 0; a < updatedArray.length; a++) {
                updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
            }

            await User.updateOne({
                "_id": new ObjectId(request.session.user._id)
            }, {
                $set: {
                    "uploaded": updatedArray
                }
            });
            const backURL = request.header('Referer') || '/';
            result.redirect(backURL);
            return false;
        }
        result.redirect("/Login");
    });

    app.post("/DeleteFile", async function (request, result) {
        const _id = request.fields._id;

        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });

            var updatedArray = await removeFileReturnUpdated(user.uploaded, _id);
            for (var a = 0; a < updatedArray.length; a++) {
                updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
            }

            await User.updateOne({
                "_id": new ObjectId(request.session.user._id)
            }, {
                $set: {
                    "uploaded": updatedArray
                }
            });

            const backURL = request.header('Referer') || '/';
            result.redirect(backURL);
            return false;
        }

        result.redirect("/Login");
    });

    app.post("/UploadFile", async function (request, result) {
        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });

            if (request.files.file.size > 0) {
                const _id = request.fields._id;

                var uploadedObj = {
                    "_id": new ObjectId(),
                    "size": request.files.file.size,
                    "name": request.files.file.name,
                    "type": request.files.file.type,
                    "filePath": "",
                    "createdAt": new Date().getTime()
                };

                var filePath = "";

                if (_id == "") {
                    filePath = "public/uploads/" + user.email + "/" + new Date().getTime() + "-" + request.files.file.name;
                    uploadedObj.filePath = filePath;

                    if (!FileSystem.existsSync("public/uploads/" + user.email)) {
                        FileSystem.mkdirSync("public/uploads/" + user.email);
                    }
                } else {
                    var folderObj = await recursiveGetFolder(user.uploaded, _id);
                    if (folderObj) {
                        filePath = folderObj.folderPath + "/" + request.files.file.name;
                        uploadedObj.filePath = filePath;
                    } else {
                        request.status = "error";
                        request.message = "Folder not found.";
                        result.render("MyUploads", {
                            "request": request
                        });
                        return false;
                    }
                }

                if (filePath) {
                    FileSystem.readFile(request.files.file.path, function (err, data) {
                        if (err) throw err;
                        console.log('File read!');

                        FileSystem.writeFile(filePath, data, async function (err) {
                            if (err) throw err;
                            console.log('File written!');

                            await User.updateOne({
                                "_id": new ObjectId(request.session.user._id)
                            }, {
                                $push: {
                                    "uploaded": uploadedObj
                                }
                            });

                            request.session.status = "success";
                            request.session.message = "Image has been uploaded. Try our premium version for image compression.";

                            result.redirect("/MyUploads/" + _id);
                        });

                        FileSystem.unlink(request.files.file.path, function (err) {
                            if (err) throw err;
                            console.log('File deleted!');
                        });
                    });
                } else {
                    request.status = "error";
                    request.message = "Invalid file path.";
                    result.render("MyUploads", {
                        "request": request
                    });
                }
            } else {
                request.status = "error";
                request.message = "Please select a valid image.";

                result.render("MyUploads", {
                    "request": request
                });
            }
        } else {
            result.redirect("/Login");
        }
    });

    app.post("/CreateFolder", async function (request, result) {
        const name = request.fields.name;
        const _id = request.fields._id;

        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });

            var uploadedObj = {
                "_id": new ObjectId(),
                "type": "folder",
                "folderName": name,
                "files": [],
                "folderPath": "",
                "createdAt": new Date().getTime()
            };

            var folderPath = "";
            var updatedArray = [];
            if (_id == "") {
                folderPath = "public/uploads/" + user.email + "/" + name;
                uploadedObj.folderPath = folderPath;

                if (!FileSystem.existsSync("public/uploads/" + user.email)) {
                    FileSystem.mkdirSync("public/uploads/" + user.email);
                }
            } else {
                var folderObj = await recursiveGetFolder(user.uploaded, _id);
                if (folderObj) {
                    uploadedObj.folderPath = folderObj.folderPath + "/" + name;
                    updatedArray = await getUpdatedArray(user.uploaded, _id, uploadedObj);
                } else {
                    request.status = "error";
                    request.message = "Folder not found.";
                    result.redirect("/MyUploads");
                    return false;
                }
            }

            if (uploadedObj.folderPath == "") {
                request.session.status = "error";
                request.session.message = "Folder name must not be empty.";
                result.redirect("/MyUploads");
                return false;
            }

            if (FileSystem.existsSync(uploadedObj.folderPath)) {
                request.session.status = "error";
                request.session.message = "Folder with the same name already exists.";
                result.redirect("/MyUploads");
                return false;
            }

            FileSystem.mkdirSync(uploadedObj.folderPath);

            if (_id == "") {
                await User.updateOne({
                    "_id": new ObjectId(request.session.user._id)
                }, {
                    $push: {
                        "uploaded": uploadedObj
                    }
                });
            } else {
                for (var a = 0; a < updatedArray.length; a++) {
                    updatedArray[a]._id = new ObjectId(updatedArray[a]._id);
                }

                await User.updateOne({
                    "_id": new ObjectId(request.session.user._id)
                }, {
                    $set: {
                        "uploaded": updatedArray
                    }
                });
            }

            result.redirect("/MyUploads/" + _id);
            return false;
        }

        result.redirect("/Login");
    });

    app.get("/MyUploads/:_id?", async function (request, result) {
        const _id = request.params._id;

        if (request.session.user) {
            var user = await User.findOne({
                "_id": new ObjectId(request.session.user._id)
            });

            if (!user) {
                request.status = "error";
                request.message = "User not found.";
                result.redirect("/Login");
                return false;
            }

            var uploaded = null;
            var folderName = "";
            var createdAt = "";

            if (typeof _id === "undefined") {
                uploaded = user.uploaded;
            } else {
                var folderObj = await recursiveGetFolder(user.uploaded, _id);

                if (folderObj == null) {
                    request.status = "error";
                    request.message = "Folder not found.";
                    result.render("MyUploads", {
                        "request": request,
                        "uploaded": [],
                        "_id": _id,
                        "folderName": folderName,
                        "createdAt": createdAt
                    });
                    return false;
                }

                uploaded = folderObj.files;
                folderName = folderObj.folderName;
                createdAt = folderObj.createdAt;
            }

            result.render("MyUploads", {
                "request": request,
                "uploaded": uploaded,
                "_id": _id,
                "folderName": folderName,
                "createdAt": createdAt
            });
            return false;
        }

        result.redirect("/Login");
    });

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
        let isVerified = false;
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
                        request.message = "Signed up successfully. Please verify your email.";
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

    app.get("/ForgotPassword", function (request, result) {
        result.render("ForgotPassword", {
            "request": request
        });
    });

    app.post("/SendRecoveryLink", async function (request, result) {
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

            await sendRecoveryLink(email, reset_token);

            request.status = "success";
            request.message = "Email has been sent with the link to recover the password.";
            result.render("ForgotPassword", {
                "request": request
            });

        } catch (error) {
            console.error("Error in /SendRecoveryLink route:", error);
            result.status(500).send("Internal Server Error");
        }
    });

    app.get("/ResetPassword/:email/:reset_token", async function (request, result) {
        let email = request.params.email;
        let reset_token = request.params.reset_token;

        let user = await User.findOne({
            $and: [{
                "email": email
            }, {
                "reset_token": parseInt(reset_token)
            }]
        });

        if (user == null) {
            request.status = "error";
            request.message = "Link is expired.";
            result.render("Error", {
                "request": request
            });
            return false;
        }

        result.render("ResetPassword", {
            "request": request,
            "email": email,
            "reset_token": reset_token
        });
    });

    app.post("/ResetPassword", async function (request, result) {
        let email = request.fields.email;
        let reset_token = request.fields.reset_token;
        let new_password = request.fields.new_password;
        let confirm_password = request.fields.confirm_password;

        if (new_password != confirm_password) {
            request.status = "error";
            request.message = "Passwords do not match.";

            result.render("ResetPassword", {
                "request": request,
                "email": email,
                "reset_token": reset_token
            });

            return false;
        }

        let user = await User.findOne({
            $and: [{
                "email": email,
            }, {
                "reset_token": parseInt(reset_token)
            }]
        });

        if (user == null) {
            request.status = "error";
            request.message = "Email does not exist or recovery link is expired.";

            result.render("ResetPassword", {
                "request": request,
                "email": email,
                "reset_token": reset_token
            });

            return false;
        }

        bcrypt.hash(new_password, 10, async function (error, hash) {
            await User.findOneAndUpdate({
                $and: [{
                    "email": email,
                }, {
                    "reset_token": parseInt(reset_token)
                }]
            }, {
                $set: {
                    "reset_token": "",
                    "password": hash
                }
            });

            request.status = "success";
            request.message = "Password has been changed. Please try logging in again.";

            result.render("Login", {
                "request": request
            });
        });
    });

    app.get("/Logout", function (request, result) {
        request.session.destroy();
        result.redirect("/");
    });

    http.listen(3000, function () {
        console.log("Server started at " + mainURL);
    });
}).catch(error => {
    console.error("Database connection error:", error);
});
