const knox = require("knox-s3");
const fs = require("fs");

let secrets;
if (process.env.NODE_ENV == "production") {
    secrets = process.env; // in prod the secrets are environment variables
} else {
    secrets = require("./secret.json"); // secrets.json is in .gitignore
}
const client = knox.createClient({
    key: secrets.AWS_KEY,
    secret: secrets.AWS_SECRET,
    bucket: "danielvarga-salt"
});

module.exports.deleteImage = function deleteImage(fileName) {
    client
        .del(fileName)
        .on("response", res => {
            console.log("status code", res.statusCode);
            console.log("header", res.headers);
        })
        .end();
};

module.exports.upload = function upload(req, res, next) {
    if (!req.file) {
        console.log("file upload error, no file selected");
        return res.sendStatus(500);
    }

    const s3Request = client.put(req.file.filename, {
        "Content-Type": req.file.mimetype,
        "Content-Length": req.file.size,
        "x-amz-acl": "public-read"
    });

    const readStream = fs.createReadStream(req.file.path);
    readStream.pipe(s3Request);

    s3Request.on("response", s3Response => {
        console.log("s3Response.statusCode: ", s3Response.statusCode);
        const wasSuccessful = s3Response.statusCode == 200;
        if (wasSuccessful) {
            next();
        } else {
            //if the image was not successfully uploaded
            res.sendStatus(500);
        }
    });
};
