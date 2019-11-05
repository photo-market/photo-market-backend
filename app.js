const http = require('http');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const bodyParser = require('body-parser');
const passport = require('passport');
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
 * Initialize a simple http server
 */
const server = http.createServer(app);

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 8080);
app.disable('x-powered-by');
app.use(expressLogger);
app.use(cors({
    origin: ['http://localhost:3000', 'https://photo-market.club'],
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(compression());
app.use(expressStatusMonitor({path: '/status', ignoreStartsWith: '/admin'}));
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
if (process.env.NODE_ENV === 'development') {
    // show stacktraces only use in development
    const errorHandler = require('errorhandler');
    app.use(errorHandler());
}

app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).send({error: 'Server Error'});
});


/**
 * Add chat.
 */
require('./config/chat')(server);

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
    logger.info('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
    logger.info('Press CTRL-C to stop\n');
});
