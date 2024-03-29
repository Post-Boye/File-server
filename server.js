const express = require("express");
const app = express();
const httpObj = require("http");
const http = httpObj.createServer(app);

const mainURL = "http://localhost:3000";

const mongodb = require("mongodb");
const mongoClient = mongodb.MongoClient;
const ObjectId = mongodb.ObjectId;

http.listen(3000,function(){
    console.log("server started at " + mainURL);

    mongoClient.connect("mongodb://localhost:27017",{
        useUnifiedTopology: true
    }, function (error,client){
        database = client.db("File_server");
        console.log("Database connected");
    });
});