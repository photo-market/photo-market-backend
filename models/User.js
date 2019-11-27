const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const {Schema} = mongoose;

const userSchema = new Schema({
    email: {type: String, unique: true, required: [true, `Why no password?`]},
    password: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerificationToken: String,
    emailVerified: Boolean,
    lastSeen: Date,
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
userSchema.pre('save', function save(next) {
    const user = this;
    if (!user.isModified('password')) {
        return next();
    }
    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return next(err);
        }
        bcrypt.hash(user.password, salt, (err, hash) => {
            if (err) {
                return next(err);
            }
            user.password = hash;
            next();
        });
    });
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
        cb(err, isMatch);
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
