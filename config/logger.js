
const logger = require('pino')({
    level: process.env.LOG_LEVEL || 'info',
});

// exports.logger =
module.exports = logger;