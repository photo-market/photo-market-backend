const Email = require('email-templates');
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
    service: 'SendGrid',
    auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
    }
});

const isDev = process.env.NODE_ENV === 'development';

const email = new Email({
    send: !isDev,
    preview: isDev,
    transport: transporter,
    views: {root: __dirname},
    message: {
        from: process.env.EMAIL_USER
    }
});

exports.sendEmail = (options) => {
    return email.send(options);
};

