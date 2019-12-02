const express = require('express');
const passport = require('passport');
const router = express.Router();

/**
 * API keys and Passport configuration.
 */
const pConfig = require('../config/passport');

/**
 * Import controllers
 */
const authController = require('../controllers/auth');
const homeController = require('../controllers/home');
const userController = require('../controllers/user');

/**
 * Configure router map
 */

// Home page
router.get('/', homeController.index);

// Auth
router.post('/auth/login', authController.postLogin);
router.post('/auth/logout', authController.logout);
router.post('/auth/forgot', authController.postForgot);
router.post('/auth/reset-password', authController.postReset);
router.post('/auth/signup', authController.postSignup);
router.post('/auth/verify', pConfig.isAuthenticated, authController.postVerifyEmail);
router.get('/auth/verify/:token', pConfig.isAuthenticated, authController.getVerifyEmailToken);
router.post('/auth/password', pConfig.isAuthenticated, authController.postUpdatePassword);
router.get('/auth/unlink/:provider', pConfig.isAuthenticated, authController.getOauthUnlink);
router.get('/auth/sessions', pConfig.isAuthenticated, authController.getSessions);

// Account
router.get('/account', pConfig.isAuthenticated, userController.getAccount);
router.post('/account/profile', pConfig.isAuthenticated, userController.postUpdateProfile);
router.post('/account/delete', pConfig.isAuthenticated, userController.postDeleteAccount);

// Service area
router.use('/admin', require('./admin'));

module.exports = router;