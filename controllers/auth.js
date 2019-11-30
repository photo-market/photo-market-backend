const passport = require('passport');
const validator = require('validator');
const mailChecker = require('mailchecker');
const asyncHandler = require('express-async-handler');
const logger = require('../config/logger');
const Joi = require('@hapi/joi');
const {promisify} = require('util');
const crypto = require('crypto');
const _ = require('lodash');
const util = require('util');
const emails = require('../emails');
const UserModel = require('../models/User');
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

const resetPasswordSchema = Joi.object().keys({
    token: Joi.string().required(),
    password: Joi.string().min(6).max(30).required()
});

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = asyncHandler(async (req, res, next) => {
    const {error} = validationPostLoginSchema.validate(req.body);
    if (error) {
        return res.status(400).send({
            code: 'BadRequestException',
            errors: error.details
        });
    }
    req.body.email = validator.normalizeEmail(req.body.email, {gmail_remove_dots: false});
    passport.authenticate('local', (err, user, info) => {
        if (err || !user) return res.status(400).send({code: 'NotAuthorizedException', msg: info});
        req.login(user, (err) => {
            if (err) return next(err);
            return res.status(200).send({
                code: 'Ok',
                success: 'Success! You are logged in.',
                user: {
                    id: user.id,
                    email: user.email,
                    createdAt: user.createdAt,
                    updatedAt: user.createdAt,
                    profile: user.profile
                }
            });
        });
    })(req, res, next);
});

/**
 * POST /logout
 * Log out.
 */
exports.logout = (req, res) => {
    req.logout();
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
exports.postUpdatePassword = asyncHandler(async (req, res, next) => {
    const {error} = postUpdatePasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).send({errors: error.details});
    }
    const user = await UserModel.findById(req.user.id);
    user.password = req.body.password;
    await user.save();
    return res.status(200).send({message: {msg: 'Password has been changed.'}});
});

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = asyncHandler(async (req, res, next) => {
    const {email, password, firstName, lastName} = req.body;

    const {error} = validationSignupSchema.validate(req.body);
    if (error) {
        return res.status(400).send({
            code: 'BadRequestException',
            msg: error.details
        });
    }
    const user = new UserModel({
        email: validator.normalizeEmail(email, {gmail_remove_dots: false}),
        password: password,
        profile: {
            firstName: firstName,
            lastName: lastName,
        }
    });
    const existingUser = await UserModel.findOne({email: user.email});
    if (existingUser) {
        return res.status(400).send({
            code: 'UserExistsException',
            msg: 'Account with that email address already exists.'
        });
    }
    await user.save();
    try {
        await logInUser(req, user);
    } catch (e) {
        logger.error(`Can't signin user.\n${JSON.stringify(e)}`);
        logger.error(e);
    }
    return res.status(201).send({code: 'Ok', msg: 'User created.'});
});

/**
 * GET /account/verify/:token
 * Verify email address
 */
exports.getVerifyEmailToken = async (req, res, next) => {
    const token = req.params.token;
    if (req.user.emailVerified) {
        return res.status(400).send({
            code: 'AlreadyVerifiedException',
            msg: 'The email address has been verified already.'
        });
    }
    if (token && (!validator.isHexadecimal(token))) {
        return res.status(400).send({
            code: 'InvalidTokenException',
            msg: 'Invalid Token.  Please retry.'
        });
    }
    if (token === req.user.emailVerificationToken) {
        try {
            const user = UserModel.findOne({email: req.user.email});
            if (!user) {
                return res.send({
                    code: 'UserNotFoundException',
                    error: 'There was an error in loading your profile.'
                })
            }
            user.emailVerificationToken = '';
            user.emailVerified = true;
            await user.save();
            return res.status(200).send({info: 'Thank you for verifying your email address.'});
        } catch (e) {
            logger.error('Error saving the user profile to the database after email verification', error);
            return res.status(200).send({error: 'There was an error when updating your profile.  Please try again later.'});
        }
    }
};

/**
 * POST /account/verify
 * Send "verify email address" email
 */
exports.postVerifyEmail = asyncHandler(async (req, res, next) => {
    if (!mailChecker.isValid(req.user.email)) {
        return res.status(200).send({errors: 'The email address is invalid or disposable and can not be verified. Please update your email address and try again.'})
    }
    if (req.user.emailVerified) {
        return res.status(200).send({info: 'The email address already has been verified.'})
    }
    const buf = await randomBytesAsync(16);
    const token = buf.toString('hex');
    const user = await UserModel.findOne({email: req.user.email});
    user.emailVerificationToken = token;
    await user.save();
    try {
        await emails.sendEmail({
            template: 'email-verify',
            message: {to: req.user.email},
            locals: {
                name: 'Elon',
                host: req.headers.host,
                token: token
            }
        });
        res.status(200).send({info: `An e-mail has been sent to ${req.user.email} with further instructions.`});
    } catch (e) {
        logger.error(`Can't send email:\n${JSON.stringify(e)}`);
        res.status(500).send({errors: 'Error sending the email verification message. Please try again shortly.'});
    }
});

/**
 * POST /auth/reset-password
 * Process the reset password request.
 */
exports.postReset = asyncHandler(async (req, res, next) => {
    const {error} = resetPasswordSchema.validate(req.body);
    if (error) {
        return res.status(400).send({
            code: 'BadRequestException',
            errors: error.details
        });
    }

    const user = await UserModel
        .findOne({passwordResetToken: req.body.token})
        .where('passwordResetExpires').gt(Date.now());

    if (!user) {
        return res.status(400).send({
            code: 'CodeExpiredException',
            error: 'Password reset token is invalid or has expired.'
        });
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    try {
        // http://www.passportjs.org/docs/login/
        await util.promisify(req.login)(user);
    } catch (e) {
        logger.error(`Can't signin user.\n ${JSON.stringify(e)}`);
    }

    try {
        logger.info(`Sending email to ${process.env.BASE_URL}`);
        await emails.sendEmail({
            template: 'reset-password',
            message: {to: user.email},
            locals: {
                host: process.env.BASE_URL, // req.headers.host
                email: user.email,
                name: user.profile && user.profile.firstName ? user.profile.firstName : 'Dear user',
            }
        });
        res.send({msg: 'Success! Your password has been changed.'});
    } catch (e) {
        logger.error(e);
        res.send({
            code: 'EmailException',
            msg: 'Your password has been changed, however we were unable to send you a confirmation email. We will be looking into it shortly.'
        });
    }
});


/**
 * POST /auth/forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = asyncHandler(async (req, res, next) => {
    if (!validator.isEmail(req.body.email)) {
        res.status(400).send({
            code: 'BadRequestException',
            msg: 'Please enter a valid email address.'
        });
        return;
    }

    req.body.email = validator.normalizeEmail(req.body.email, {gmail_remove_dots: false});

    const buf = await randomBytesAsync(16);
    const token = buf.toString('hex');
    const user = await UserModel.findOne({email: req.body.email});
    if (!user) {
        return res.status(404).send({
            code: 'UserNotFoundException',
            msg: 'Account with that email address does not exist.'
        });
    }
    user.passwordResetToken = token;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();
    try {
        await emails.sendEmail({
            template: 'forgot-password',
            message: {to: user.email},
            locals: {
                host: req.headers.host,
                token: user.passwordResetToken
            }
        });
        res.status(200).send({info: `An e-mail has been sent to ${user.email} with further instructions.`});
    } catch (e) {
        res.status(500).send({code: 'SendEmailException', msg: 'Cant send email message. Please try again shortly.'});
    }
});


/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = asyncHandler(async (req, res, next) => {
    const {provider} = req.params;
    const user = await UserModel.findById(req.user.id);
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
    await user.save();
    return res.status(200).send({msg: `${_.startCase(_.toLower(provider))} account has been unlinked.`});
});


function logInUser(req, user) {
    return new Promise((resolve, reject) => {
        req.login(user, function (err) {
            if (err) reject(err);
            resolve();
        });
    });
}