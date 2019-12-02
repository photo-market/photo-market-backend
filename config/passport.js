const passport = require('passport');
const moment = require('moment');
const refresh = require('passport-oauth2-refresh');
const logger = require('../config/logger');
const {Strategy: LocalStrategy} = require('passport-local');
const {Strategy: GoogleStrategy} = require('passport-google-oauth');
const {Strategy: FacebookStrategy} = require('passport-facebook');

const User = require('../models/User');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

/**
 * Sign in using Email and Password.
 * The Local strategy extracts the username and password from req.body and verifies the user by verifying it against the User table.
 */
passport.use(new LocalStrategy({usernameField: 'email'}, async (email, password, done) => {
    try {
        const user = await User.findOne({email: email.toLowerCase()}).exec();
        if (!user) return done(null, false, `Email ${email} not found.`);
        if (!user.password) return done(null, false, 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.');
        if (!await user.verifyPassword(password)) return done(null, false, 'Invalid email or password.');
        return done(null, user);
    } catch (e) {
        done(e, false);
    }
}));


// passport.use(new GoogleStrategy({
//         returnURL: 'http://localhost:3000/auth/google/return',
//         realm: 'http://localhost:3000/'
//     },
//     function (identifier, done) {
//         User.findByOpenID({openId: identifier}, function (err, user) {
//             return done(err, user);
//         });
//     }
// ));
//
// passport.use(new FacebookStrategy({
//         clientID: FACEBOOK_APP_ID,
//         clientSecret: FACEBOOK_APP_SECRET,
//         callbackURL: "http://localhost:3000/auth/facebook/callback"
//     },
//     function (accessToken, refreshToken, profile, cb) {
//         User.findOrCreate({facebookId: profile.id}, function (err, user) {
//             return cb(err, user);
//         });
//     }
// ));


/**
 * Login Required middleware.
 */
exports.isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    return res.status(401).send({error: "You need to be authenticated to access this resource."});
};

exports.hasRole = (req, res, next) => {
    // check role
    // Authorization
};

/**
 * Authorization Required middleware.
 */
exports.isAuthorized = (req, res, next) => {
    const provider = req.path.split('/')[2];
    const token = req.user.tokens.find((token) => token.kind === provider);
    if (token) {
        // Is there an access token expiration and access token expired?
        // Yes: Is there a refresh token?
        //     Yes: Does it have expiration and if so is it expired?
        //       Yes, Quickbooks - We got nothing, redirect to res.redirect(`/auth/${provider}`);
        //       No, Quickbooks and Google- refresh token and save, and then go to next();
        //    No:  Treat it like we got nothing, redirect to res.redirect(`/auth/${provider}`);
        // No: we are good, go to next():
        if (token.accessTokenExpires && moment(token.accessTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
            if (token.refreshToken) {
                if (token.refreshTokenExpires && moment(token.refreshTokenExpires).isBefore(moment().subtract(1, 'minutes'))) {
                    res.redirect(`/auth/${provider}`);
                    //
                    res.status(401).end();
                } else {
                    refresh.requestNewAccessToken(`${provider}`, token.refreshToken, (err, accessToken, refreshToken, params) => {
                        User.findById(req.user.id, (err, user) => {
                            user.tokens.some((tokenObject) => {
                                if (tokenObject.kind === provider) {
                                    tokenObject.accessToken = accessToken;
                                    if (params.expires_in) tokenObject.accessTokenExpires = moment().add(params.expires_in, 'seconds').format();
                                    return true;
                                }
                                return false;
                            });
                            req.user = user;
                            user.markModified('tokens');
                            user.save((err) => {
                                if (err) console.log(err);
                                next();
                            });
                        });
                    });
                }
            } else {
                res.redirect(`/auth/${provider}`);
            }
        } else {
            next();
        }
    } else {
        // no token provided
        res.status(401).end();
    }
};
