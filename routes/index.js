const express = require('express');
const router = express.Router();

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('../config/passport');

/**
 * Import controllers
 */
authController = require('../controllers/auth');
homeController = require('../controllers/home');
userController = require('../controllers/user');

/**
 * Configure router
 */
router.get('/', homeController.index);

// Auth
router.post('/auth/login', authController.postLogin);
router.post('/auth/logout', authController.logout);
router.post('/auth/forgot', authController.postForgot);
router.post('/auth/reset/:token', authController.postReset);
router.post('/auth/signup', authController.postSignup);
router.post('/auth/verify', passportConfig.isAuthenticated, authController.postVerifyEmail);
router.get('/auth/verify/:token', passportConfig.isAuthenticated, authController.getVerifyEmailToken);
router.post('/auth/password', passportConfig.isAuthenticated, authController.postUpdatePassword);
router.get('/auth/unlink/:provider', passportConfig.isAuthenticated, authController.getOauthUnlink);

// Account
router.get('/account', passportConfig.isAuthenticated, userController.getAccount);
router.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
router.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);

module.exports = router;