const fileSystem = require("fs");
const mongodb = require('mongodb');
const ObjectId = mongodb.ObjectId;

function recursiveGetFile(files, _id) {
    for (let file of files) {
        if (file.type !== "folder" && file._id === _id) {
            return file;
        }
        if (file.type === "folder" && file.files.length > 0) {
            let foundFile = recursiveGetFile(file.files, _id);
            if (foundFile) {
                return foundFile;
            }
        }
    }
    return null;
}

function getUpdatedArray(arr, _id, uploadedObj) {
    for (let folder of arr) {
        if (folder.type === "folder" && folder._id === _id) {
            folder.files.push(uploadedObj);
        }
        if (folder.files.length > 0) {
            getUpdatedArray(folder.files, _id, uploadedObj);
        }
    }
    return arr;
}

function removeFileReturnUpdated(arr, _id) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].type !== "folder" && arr[i]._id === _id) {
            try {
                fileSystem.unlinkSync(arr[i].filePath);
            } catch (exp) { /* handle error */ }
            arr.splice(i, 1);
            break;
        }
        if (arr[i].type === "folder" && arr[i].files.length > 0) {
            removeFileReturnUpdated(arr[i].files, _id);
        }
    }
    return arr;
}

function recursiveSearch(files, query) {
    for (let file of files) {
        if (file.type === "folder") {
            if (file.folderName.toLowerCase().includes(query.toLowerCase())) {
                return file;
            }
            let foundFile = recursiveSearch(file.files, query);
            if (foundFile) {
                if (foundFile.type !== "folder") {
                    foundFile.parent = file;
                }
                return foundFile;
            }
        } else if (file.name.toLowerCase().includes(query.toLowerCase())) {
            return file;
        }
    }
    return null;
}

function recursiveSearchShared(files, query) {
    for (let sharedFile of files) {
        let file = sharedFile.file || sharedFile;
        if (file.type === "folder") {
            if (file.folderName.toLowerCase().includes(query.toLowerCase())) {
                return file;
            }
            let foundFile = recursiveSearchShared(file.files, query);
            if (foundFile) {
                if (foundFile.type !== "folder") {
                    foundFile.parent = file;
                }
                return foundFile;
            }
        } else if (file.name.toLowerCase().includes(query.toLowerCase())) {
            return file;
        }
    }
    return null;
}

module.exports = {
    recursiveGetFile,
    getUpdatedArray,
    removeFileReturnUpdated,
    recursiveSearch,
    recursiveSearchShared
};
