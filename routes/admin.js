const express = require('express');

const adminController = require("../controllers/admin");
const testController = require("../controllers/test");

const adminRoutes = express.Router();
const passportConfig = require('../config/passport');

// Applying middleware to all routes in the router
adminRoutes.use((req, res, next) => {

});

adminRoutes.get('/', passportConfig.hasRole, adminController.getInfo);
adminRoutes.get('/test/throw', testController.getThrow);

module.exports = adminRoutes;