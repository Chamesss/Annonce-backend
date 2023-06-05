const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let dir = "./uploads/";
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(
            null,
            file.originalname
        );
    },
});

const fileFilter = function(req, file, cb) {
    const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
  
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Wrong file type');
      error.code = 'WRONG_FILE_TYPE';
      return cb(error, false);
    }
  
    cb(null, true);
  }
  


module.exports = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 16, // 16MB
    },
    fileFilter: fileFilter

});
