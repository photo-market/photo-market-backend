const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const passport = require('passport');
const errorHandler = require('errorhandler');
const dotenv = require('dotenv');
const chalk = require('chalk');
const session = require('express-session');
const expressStatusMonitor = require('express-status-monitor');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const logger = require('./config/logger');
const expressLogger = require('express-pino-logger')({logger});

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config();

/**
 * Connect to MongoDB.
 */
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
mongoose.set('useUnifiedTopology', true);
mongoose.set('debug', true);
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
    logger.error(err);
    logger.error('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
    process.exit();
});

/**
 * Create Express server.
 */
const app = express();

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 8080);
app.disable('x-powered-by');
app.use(expressLogger);
app.use(expressStatusMonitor({path: '/status', ignoreStartsWith: '/admin'}));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: {maxAge: 1209600000}, // two weeks in milliseconds
    store: new MongoStore({
        url: process.env.MONGODB_URI,
        autoReconnect: true,
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./routes'));

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
    // only use in development
    app.use(errorHandler());
} else {
    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).send({error: 'Server Error'});
    });
}

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
    logger.info('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
    logger.info('Press CTRL-C to stop\n');
});
