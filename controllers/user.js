const validator = require('validator');
const User = require('../models/User');

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
    User.findById(req.user.id, (err, user) => {
        if (err) return next(err);
        return res.status(200).send({user: user, profile: user.profile || {}});
    });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) validationErrors.push({msg: 'Please enter a valid email address.'});
    if (validationErrors.length) {
        return res.status(400).send({error: validationErrors});
    }

    req.body.email = validator.normalizeEmail(req.body.email, {gmail_remove_dots: false});

    User.findById(req.user.id, (err, user) => {
        if (err) return next(err);
        if (user.email !== req.body.email) user.emailVerified = false;
        user.email = req.body.email || '';
        user.profile.name = req.body.name || '';
        user.profile.gender = req.body.gender || '';
        user.profile.location = req.body.location || '';
        user.profile.website = req.body.website || '';
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



