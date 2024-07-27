const express = require("express");
const authController = require("../controllers/auth");
const { body } = require("express-validator");
const router = express.Router();
const User = require("../models/user");

// Login route
router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email address."),
    body("password").notEmpty().withMessage("Invalid Password.")
  ],
  authController.postLogin
);

// Signup route
router.get("/signup", authController.getSignup);

router.post(
  "/signup",
  [
    body("email").isEmail().withMessage("Please enter a valid email address.").normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long."),
    body('confirmPassword')
      .custom((value, { req }) => {
        return value === req.body.password; // Check if passwords match
      })
      .withMessage('Passwords do not match.')
      .bail() // Stops further validations if this one fails
      .custom(async (value, { req }) => {
        // Check if the email is already in use
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
          throw new Error('Email address is already in use.');
        }
        return true;
      })
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);
router.get("/reset-password", authController.getResetPassword);
router.post("/reset-password", authController.postResetPassword);
router.get("/update-password/:token", authController.getUpdatePassword);
router.post("/update-password", authController.postUpdatePassword);

module.exports = router;
