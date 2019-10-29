const util = require('util');
const logger = require('../config/logger');
const validator = require('validator');
const Joi = require('@hapi/joi');
const User = require('../models/User');

const validationUserSchema = Joi.object().keys({
    name: Joi.string().alphanum().min(3).max(30).required(),
    gender: Joi.string().alphanum().min(3).max(10).required(),
    location: Joi.string(),
    website: Joi.string(),
    email: Joi.string().email(),
    // password: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/),
});

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
    User.findById(req.user.id, (err, user) => {
        if (err) return next(err);
        const {profile, email, emailVerified, createdAt, updatedAt} = user;
        return res.send({email, emailVerified, createdAt, updatedAt, profile});
    });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
    const body = req.body;

    // Validation
    const {error} = validationUserSchema.validate(body);
    if (error) {
        return res.status(400).send({errors: error.details});
    }

    User.findById(req.user.id)
        .then((dbUser) => {
            // Transform
            //body.email = validator.normalizeEmail(body.email, {gmail_remove_dots: false});
            dbUser.email = body.email || dbUser.email;
            const {profile} = dbUser;
            dbUser.profile = profile || {};
            dbUser.profile.name = body.name || '';
            dbUser.profile.gender = body.gender || '';
            dbUser.profile.location = body.location || '';
            dbUser.profile.website = body.website || '';
            return dbUser;
        })
        .then((dbUser) => {
            return dbUser.save();
        })
        .then(() => {
            res.status(200).send({success: 'Profile information has been updated.'});
        })
        .catch((err) => {
            if (err && err.code === 11000) { // MongoDB 11000 - duplicate key error index
                return res.status(400).send({error: 'The email address you have entered is already associated with an account.'});
            }
            logger.error(`Can't update user profile (userId = ${req.user.id}`, err);
            res.status(500).send({error: "Can't update profile for now."});
            // next(err); // or this one
        })

};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
    User.deleteOne({_id: req.user.id}, (err) => {
        if (err) return next(err);
        req.logout();
        return res.status(200).send({message: {msg: 'Your account has been deleted.'}});
    });
};



