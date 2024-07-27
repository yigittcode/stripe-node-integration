const express = require("express");
const router = express.Router();
const multer = require('multer');
const { body, check } = require("express-validator");
const isAuth = require("../middleware/is-auth");
const adminController = require("../controllers/admin");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.mimetype.split('/')[1];
    const filename = file.originalname.replace(/\.[^/.]+$/, "") + '-' + uniqueSuffix + '.' + fileExtension;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); 
  
  } else {   
     cb(new Error('Only image files are allowed!'), false); // Resim türleri dışındaki dosyalar reddediliyor
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter
});

// Router tanımlamaları
router.get("/add-product", isAuth, adminController.getAddProduct);
router.post(
  "/add-product",
  isAuth,
  upload.single('image'),
  [
    body("title").notEmpty().withMessage("Title cannot be empty.").trim(),
    check("image").custom((value, { req }) => req.file),
    body("price").notEmpty().withMessage("Price cannot be empty.").isFloat({ gt: 0 }).withMessage("Price must be a number greater than 0.")
  ],  
  adminController.postAddProduct
);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);
router.post(
  "/edit-product",
  isAuth,
  upload.single('image'),
  [
    body("title").notEmpty().withMessage("Title cannot be empty.").trim(),
    body("price").notEmpty().withMessage("Price cannot be empty.").isFloat({ gt: 0 }).withMessage("Price must be a number greater than 0.")
  ],
  adminController.postEditProduct
);

router.get("/products", isAuth, adminController.getProducts);

router.delete("/delete-product/:productID", isAuth, adminController.postDeleteProduct);

module.exports = router;
