
//function to upload image with proper validation function
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'tmp')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
            cb(null, true);
        } else {
            return cb(new Error('Invalid mime type'));
        }
    }
});

const uploadSingleImage = upload.single('image');

app.post('/upload', function (req, res) {

    uploadSingleImage(req, res, function (err) {

        if (err) {
            return res.status(400).send({ message: err.message })
        }

        // Everything went fine.
        const file = req.file;
        res.status(200).send({
            filename: file.filename,
            mimetype: file.mimetype,
            originalname: file.originalname,
            size: file.size,
            fieldname: file.fieldname
        })
    })
})