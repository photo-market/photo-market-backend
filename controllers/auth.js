const passport = require('passport');
const validator = require('validator');
const mailChecker = require('mailchecker');
const logger = require('../config/logger');
const Joi = require('@hapi/joi');
const {promisify} = require('util');
const crypto = require('crypto');
const _ = require('lodash');

const emails = require('../emails');
const User = require('../models/User');
const randomBytesAsync = promisify(crypto.randomBytes);

const validationPostLoginSchema = Joi.object().keys({
    email: Joi.string().email().min(3).max(30).required(),
    password: Joi.string().min(6).max(30).required(),
    rememberMe: Joi.boolean(),
    device: Joi.string()
});

const postUpdatePasswordSchema = Joi.object().keys({
    email: Joi.string().email().min(3).max(30).required(),
    password: Joi.string().min(6).max(30).required(),
    confirmPassword: Joi.ref('password'),
});

const validationSignupSchema = Joi.object().keys({
    email: Joi.string().email().min(3).max(30).required(),
    password: Joi.string().min(6).max(30).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required()
});


/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = async (req, res, next) => {
    // Validation
    const {error} = validationPostLoginSchema.validate(req.body);
    if (error) {
        return res.status(400).send({code: 'BadRequestException', errors: error.details});
    }

    // Transform
    req.body.email = validator.normalizeEmail(req.body.email, {gmail_remove_dots: false});

    passport.authenticate('local', {}, (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(400).send({code: 'NotAuthorizedException', errors: info});
        req.logIn(user, (err) => {
            if (err) return next(err);
            return res.send({
                code: 'Ok',
                success: 'Success! You are logged in.',
                user: {
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.createdAt,
                    profile: user.profile
                }
            });
        });
    })(req, res, next);
};

/**
 * POST /logout
 * Log out.
 */
exports.logout = (req, res) => {
    req.logOut(); // PassportJS
    req.session.destroy((err) => {
        if (err) logger.error('Error : Failed to destroy the session during logout.', err);
        req.user = null;
        res.status(201).send();
    });
};


/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
    // Validation
    const {error} = postUpdatePasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).send({errors: error.details});
    }

    User.findById(req.user.id, (err, user) => {
        if (err) return next(err);
        user.password = req.body.password;
        user.save((err) => {
            if (err) return next(err);
            return res.status(200).send({message: {msg: 'Password has been changed.'}});

        });
    });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
    const {error} = validationSignupSchema.validate(req.body);
    if (error) {
        return res.status(400).send({
            code: 'BadRequestException',
            errors: error.details
        });
    }

    const email = validator.normalizeEmail(req.body.email, {gmail_remove_dots: false});

    const user = new User({
        email,
        password: req.body.password,
        profile: {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
        }
    });

    User.findOne({email}, (err, existingUser) => {
        if (err) return next(err);
        if (existingUser) return res.status(400).send({
            code: 'UserExistsException',
            errors: {msg: 'Account with that email address already exists.'}
        });
        user.save((err) => {
            if (err) return next(err);
            req.logIn(user, (err) => {
                if (err) return next(err);
                return res.status(201).send();
            });
        });
    });
};

/**
 * GET /account/verify/:token
 * Verify email address
 */
exports.getVerifyEmailToken = (req, res, next) => {

    if (req.user.emailVerified) {
        return res.status(400).send({
            code: 'AlreadyVerifiedException',
            msg: 'The email address has been verified already.'
        });
    }

    if (req.params.token && (!validator.isHexadecimal(req.params.token))) {
        return res.status(400).send({
            code: 'InvalidTokenException',
            msg: 'Invalid Token.  Please retry.'
        });
    }

    if (req.params.token === req.user.emailVerificationToken) {
        User
            .findOne({email: req.user.email})
            .then((user) => {
                if (!user) {
                    return res.send({
                        code: 'UserNotFoundException',
                        error: 'There was an error in loading your profile.'
                    })
                }
                user.emailVerificationToken = '';
                user.emailVerified = true;
                user = user.save();

                return res.status(200).send({info: 'Thank you for verifying your email address.'});
            })
            .catch((error) => {
                logger.error('Error saving the user profile to the database after email verification', error);
                return res.status(200).send({error: 'There was an error when updating your profile.  Please try again later.'});
            });
    }
};

/**
 * POST /account/verify
 * Send "verify email address" email
 */
exports.postVerifyEmail = (req, res, next) => {

    if (req.user.emailVerified) {
        return res.status(200).send({info: 'The email address already has been verified.'})
    }

    if (!mailChecker.isValid(req.user.email)) {
        return res.status(200).send({errors: 'The email address is invalid or disposable and can not be verified. Please update your email address and try again.'})
    }

    const createRandomToken = randomBytesAsync(16)
        .then((buf) => buf.toString('hex'));

    const setRandomToken = (token) => {
        User.findOne({email: req.user.email})
            .then((user) => {
                user.emailVerificationToken = token;
                user = user.save();
            });
        return token;
    };

    const sendVerifyEmail = (token) => {
        const options = {
            template: 'email-verify',
            message: {to: req.user.email},
            locals: {
                name: 'Elon',
                host: req.headers.host,
                token: token
            }
        };
        return emails.sendEmail(options)
            .then(() => res.status(200).send({info: `An e-mail has been sent to ${req.user.email} with further instructions.`}))
            .catch(() => res.status(500).send({errors: 'Error sending the email verification message. Please try again shortly.'}));
    };

    createRandomToken
        .then(setRandomToken)
        .then(sendVerifyEmail)
        .catch(next);
};

/**
 * POST /auth/reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
    const validationErrors = [];
    if (!validator.isLength(req.body.password, {min: 8})) validationErrors.push({msg: 'Password must be at least 8 characters long'});
    if (req.body.password !== req.body.confirm) validationErrors.push({msg: 'Passwords do not match'});
    if (!validator.isHexadecimal(req.params.token)) validationErrors.push({msg: 'Invalid Token.  Please retry.'});

    if (validationErrors.length) {
        return res.status(400).send({errors: validationErrors});
    }

    const resetPassword = () =>
        User
            .findOne({passwordResetToken: req.params.token})
            .where('passwordResetExpires').gt(Date.now())
            .then((user) => {
                if (!user) {
                    return res.send({error: 'Password reset token is invalid or has expired.'})
                }
                user.password = req.body.password;
                user.passwordResetToken = undefined;
                user.passwordResetExpires = undefined;
                return user.save().then(() => new Promise((resolve, reject) => {
                    req.logIn(user, (err) => {
                        if (err) return reject(err);
                        resolve(user);
                    });
                }));
            });

    const sendResetPasswordEmail = (user) => {
        if (!user) return;
        const options = {
            template: 'reset-password',
            message: {to: user.email},
            locals: {
                name: 'User',
                host: req.headers.host,
                email: user.email
            }
        };
        return emails.sendEmail(options)
            .then(() => res.send({msg: 'Success! Your password has been changed.'}))
            .catch(() => res.send({msg: 'Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.'}));
    };

    resetPassword()
        .then(sendResetPasswordEmail)
        .catch((err) => next(err));
};


/**
 * POST /auth/forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
    if (!validator.isEmail(req.body.email)) {
        res.status(400).send({
            code: 'BadRequestException',
            msg: 'Please enter a valid email address.'
        });
        return;
    }

    req.body.email = validator.normalizeEmail(req.body.email, {gmail_remove_dots: false});

    const createRandomToken = randomBytesAsync(16).then((buf) => buf.toString('hex'));

    const setRandomToken = (token) =>
        User
            .findOne({email: req.body.email})
            .then((user) => {
                if (!user) {
                    res.send({
                        code: 'UserNotFoundException',
                        msg: 'Account with that email address does not exist.'
                    });
                } else {
                    user.passwordResetToken = token;
                    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
                    user = user.save();
                }
                return user;
            });

    const sendForgotPasswordEmail = (user) => {
        if (!user) return;
        const options = {
            template: 'forgot-password',
            message: {to: user.email},
            locals: {
                host: req.headers.host,
                token: user.passwordResetToken
            }
        };
        return emails.sendEmail(options)
            .then(() => {
                res.status(200).send({
                    info: `An e-mail has been sent to ${user.email} with further instructions.`
                });
            })
            .catch((err) => {
                res.status(500).send({
                    code: 'SendEmailException',
                    msg: 'Cant send email message. Please try again shortly.'
                });
                throw err;
            });
    };

    createRandomToken
        .then(setRandomToken)
        .then(sendForgotPasswordEmail)
        .catch(next);
};


/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
    const {provider} = req.params;

    User.findById(req.user.id, (err, user) => {
        if (err) return next(err);
        user[provider.toLowerCase()] = undefined;
        const tokensWithoutProviderToUnlink = user.tokens.filter((token) => token.kind !== provider.toLowerCase());

        // Some auth providers do not provide an email address in the user profile.
        // As a result, we need to verify that unlinking the provider is safe by ensuring
        // that another login method exists.
        const emailIsNotSet = !(user.email && user.password);
        if (emailIsNotSet && tokensWithoutProviderToUnlink.length === 0) {
            const providerName = `${_.startCase(_.toLower(provider))}`;
            return res.status(200).send({
                error: `The ${providerName} account cannot be unlinked without another form of login enabled. Please link another account or add an email address and password.`
            });
        }
        user.tokens = tokensWithoutProviderToUnlink;
        user.save((err) => {
            if (err) return next(err);
            return res.status(200).send({msg: `${_.startCase(_.toLower(provider))} account has been unlinked.`});
        });
    });
};