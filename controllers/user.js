const validator = require('validator');
const Joi = require('@hapi/joi');
const User = require('../models/User');

const validationUserSchema = Joi.object().keys({
    name: Joi.string().alphanum().min(3).max(30).required(),
    gender: Joi.string().alphanum().min(3).max(10).required(),
    location: Joi.string(),
    website: Joi.string(),
    // email: Joi.string().email(),
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
    const {error, value} = validationUserSchema.validate(body);
    if (error) {
        return res.status(400).send({errors: error.details});
    }

    // Transform
    //body.email = validator.normalizeEmail(body.email, {gmail_remove_dots: false});

    // Update
    User.findById(req.user.id, (err, user) => {
        if (err) return next(err);

        //if (user.email !== newData.email) user.emailVerified = false;
        //user.email = newData.email || '';
        user.profile = user.profile || {};
        user.profile.name = body.name || '';
        user.profile.gender = body.gender || '';
        user.profile.location = body.location || '';
        user.profile.website = body.website || '';

        user.save((err) => {
            // If error happened
            if (err) {
                if (err.code === 11000) { // MongoDB 11000 - duplicate key error index
                    return res.status(400).send({errors: {msg: 'The email address you have entered is already associated with an account.'}});
                }
                return next(err);
            }

            // Successfully saved
            return res.status(200).send({message: {msg: 'Profile information has been updated.'}});
        });
    });
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



