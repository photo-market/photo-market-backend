const logger = require('../config/logger');
const Joi = require('@hapi/joi');
const {promisify} = require('util');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const User = require("../models/User");

exports.getPortfolios = asyncHandler(async (req, res, next) => {
    User.find({}, (err, docs) => {
        if (err) next(err);
        res.send(docs);
    });
});

exports.getPortfolio = asyncHandler(async (req, res, next) => {
    const userId = mongoose.Types.ObjectId(req.params.userId);
    console.log(userId);
    const user = await User.findById(userId).exec();
    console.log(user);
    // todo
    res.send(user.profile);
});