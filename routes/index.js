const express = require("express");
const router = express.Router();

router.get("/", (request, result) => {
    result.render("index", { "request": request });
});

router.get("/Admin", (request, result) => {
    result.render("Admin", { "request": request });
});

router.get("/Login", (request, result) => {
    result.render("Login", { "request": request });
});

router.get("/Register", (request, result) => {
    result.render("Register", { "request": request });
});

router.get("/MyUploads", async (request, result) => {
    if (request.session.user) {
        const user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });

        result.render("MyUploads", {
            "request": request,
            "uploaded": user.uploaded
        });
        return;
    }
    result.redirect("/Login");
});

router.get("/Search", async (request, result) => {
    const search = request.query.search;

    if (request.session.user) {
        const user = await database.collection("users").findOne({
            "_id": ObjectId(request.session.user._id)
        });
        const fileUploaded = await recursiveSearch(user.uploaded, search);
        const fileShared = await recursiveSearchShared(user.sharedWithMe, search);

        if (!fileUploaded && !fileShared) {
            request.status = "error";
            request.message = "File/folder '" + search + "' is neither uploaded nor shared with you.";
            result.render("Search", { "request": request });
            return;
        }

        const file = fileUploaded || fileShared;
        file.isShared = !fileUploaded;
        result.render("Search", {
            "request": request,
            "file": file
        });
        return;
    }
    result.redirect("/Login");
});

module.exports = router;
