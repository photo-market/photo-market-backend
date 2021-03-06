const http = require('http');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
const dotenv = require('dotenv');
const chalk = require('chalk');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const mongoose = require('mongoose');
const logger = require('./config/logger');
const expressLogger = require('express-pino-logger')({logger});
const useragent = require('express-useragent');

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
 * Initialize a simple http server
 */
const server = http.createServer(app);

/**
 * Express configuration.
 */
app.set('port', process.env.API_PORT || 8080);
app.disable('x-powered-by');
app.use(expressLogger);
app.use(cors({
    origin: [process.env.CORS_ORIGIN],
    credentials: true, // Configures the Access-Control-Allow-Credentials CORS header
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(compression());
app.use(useragent.express());
//app.use(expressStatusMonitor({path: '/status', ignoreStartsWith: '/admin'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: {
        domain: process.env.COOKIE_DOMAIN,
        maxAge: 1209600000 // two weeks in milliseconds
    },
    store: new MongoStore({
        url: process.env.MONGODB_URI,
        autoReconnect: true,
        autoRemove: 'native' // Default
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(require('./routes'));

/**
 * Show version
 */
app.get('/version', (req, res) => {
    const v = require('fs').readFileSync('./version.txt', "utf8");
    res.send({version: v})
});

/**
 * Handle 404 responses.
 */
app.use((req, res, next) => {
    res.status(404).send({error: "404 - Not Found"})
});

/**
 * Error Handler.
 * Must be added at the end of the middleware function stack.
 */
app.use((err, req, res, next) => {
    logger.error(err);
    let responseObj = {
        success: false,
        data: [],
        error: err,
        msg: 'There was some internal server error.',
    };
    let responseStatusCode = 500;
    if (err) {
        if (err.code) {
            responseStatusCode = err.code;
            responseObj.msg = err.msg;
        }
    }
    if (!res.headersSent) {
        res.status(responseStatusCode).json(responseObj);
    }
});

/**
 * Add websocket support.
 */
require('./config/websocket')(server);

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
    logger.info('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
    logger.info('Press CTRL-C to stop\n');
});
