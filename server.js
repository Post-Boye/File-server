const express = require("express");
const app = express();
const httpObj = require("http");
const http = httpObj.createServer(app);

const mainURL = "http://localhost:3000";

const mongodb = require("mongodb");
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

http.listen(3000,function(){
    console.log("server started at " + mainURL);

    mongoClient.connect("mongodb://localhost:27017",{
        useNewUrlParser: true
    }, function (error,client){
        database = client.db("File_server");
        console.log("Database connected.");

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




    });
});