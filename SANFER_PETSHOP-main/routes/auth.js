const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authorize = require("../controllers/authorize.js")
const controller = require("../controllers/controller.js")

router.post("/login", userController.login);
router.get("/logout", userController.logout);
router.post("/register", userController.register);
router.get("/login-attempts", authorize.authorize(["admin"]), userController.getLoginAttempts);
router.get("/editproductlist", authorize.authorize(["editor"]), controller.getEditProductList);
router.post("/forgot-password", userController.initiateReset);
router.post("/verify-security", userController.handleSecurityAnswer);
router.post("/reset-password", userController.handleResetPassword);

module.exports = router;