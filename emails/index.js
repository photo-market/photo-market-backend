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

const email = new Email({
    // uncomment below to send emails in development/test env:
    send: true,
    preview: false,
    transport: transporter,
    views: {root: __dirname},
    message: {
        from: process.env.EMAIL_USER
    }
});

exports.sendEmail = (options) => {
    return email.send(options)
        .then(logger.info)
        .catch(logger.error);
};

