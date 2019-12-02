const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    email: {type: String, unique: true, required: [true, `Why no password?`], index: true},
    password: String, // salted and hashed using bcrypt
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerified: Boolean,
    lastSeen: Date,
    lastLogin: Date,
    devices: Array,
    //connectionIds: Array, // Will be used later to identify AWS API Gateway websockets

    snapchat: String,
    facebook: String,
    google: String,
    tokens: Array,

    profile: {
        firstName: String,
        lastName: String,
        gender: String,
        location: String,
        website: String,
        picture: String
    }
}, {
    timestamps: true
}); // If set timestamps, mongoose assigns createdAt and updatedAt fields to your schema

/**
 * Password hash middleware.
 */
userSchema.pre('save', async function (next) { // NOTE: do not change this to arrow operator
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }
    const hashCost = 10;
    user.password = await bcrypt.hash(user.password, hashCost);
    next();
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.verifyPassword = function (candidatePassword) { // Note: do not replace with arrow-function
    return new Promise((resolve) => {
        bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
            resolve(!err && isMatch);
        });
    });
};

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function gravatar(size) {
    if (!size) {
        size = 200;
    }
    if (!this.email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash('md5').update(this.email).digest('hex');
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
