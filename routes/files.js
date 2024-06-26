const express = require("express");
const { ObjectId } = require("mongodb");
const fs = require("fs");
const fileSystem = require("fs");
const fileUpload = require("express-fileupload");
const { getUpdatedArray, removeFileReturnUpdated, recursiveGetFile } = require("../helpers/fileHelpers");

const router = express.Router();
router.use(fileUpload());

router.post("/UploadFile", async (request, response) => {
    const uploadedObj = {
        _id: ObjectId(),
        size: request.files.file.size,
        name: request.files.file.name,
        type: request.files.file.mimetype,
        filePath: ""
    };

    let _id = request.fields._id;
    const user = await database.collection("users").findOne({ "_id": ObjectId(request.session.user._id) });

    if (_id) {
        const updatedArray = getUpdatedArray(user.uploaded, _id, uploadedObj);
        await database.collection("users").updateOne({ "_id": ObjectId(request.session.user._id) }, {
            $set: { uploaded: updatedArray }
        });
    } else {
        user.uploaded.push(uploadedObj);
        await database.collection("users").updateOne({ "_id": ObjectId(request.session.user._id) }, {
            $set: { uploaded: user.uploaded }
        });
    }

    const filePath = `public/uploads/${request.session.user._id}/${uploadedObj._id}-${uploadedObj.name}`;
    request.files.file.mv(filePath, async (error) => {
        if (!error) {
            await database.collection("users").updateOne({ "_id": ObjectId(request.session.user._id) }, {
                $set: { "uploaded.$[element].filePath": filePath }
            }, { arrayFilters: [{ "element._id": uploadedObj._id }] });
            response.redirect("/MyUploads");
        }
    });
});

router.post("/DeleteFile", async (request, response) => {
    const _id = request.fields._id;
    const user = await database.collection("users").findOne({ "_id": ObjectId(request.session.user._id) });

    if (_id) {
        const updatedArray = removeFileReturnUpdated(user.uploaded, _id);
        await database.collection("users").updateOne({ "_id": ObjectId(request.session.user._id) }, {
            $set: { uploaded: updatedArray }
        });
        response.redirect("/MyUploads");
    }
});

router.post("/ShareFile", async (request, response) => {
    const _id = request.fields._id;
    const email = request.fields.email;

    const user = await database.collection("users").findOne({ "_id": ObjectId(request.session.user._id) });
    const otherUser = await database.collection("users").findOne({ email });

    if (_id) {
        const file = recursiveGetFile(user.uploaded, _id);

        const sharedObj = {
            _id: file._id,
            name: file.name,
            size: file.size,
            type: file.type,
            filePath: file.filePath,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        };

        await database.collection("users").updateOne({ email }, {
            $push: { sharedWithMe: sharedObj }
        });
        response.redirect("/MyUploads");
    }
});

module.exports = router;
