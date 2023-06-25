const cloudinary = require('cloudinary').v2;


function upload (file) {
    cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            file,
            {
                transformation: [
                    { width: "auto", crop: "scale", responsive: true },
                    { quality: 100, fetch_format: "auto" },
                ],
            },
            (err, res) => {
                if (err) {
                    console.log("cloudinary err:", err);
                    reject(err);
                } else {
                    console.log("cloudinary res:", res);
                    resolve(res.url);
                }
            }
        );
    });
}

module.exports = upload ;