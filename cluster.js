const cluster = require('cluster');
const os = require('os');
const logger = require('./config/logger');

if (cluster.isMaster) {
    const cpus = os.cpus().length;
    logger.info(`Forking for ${cpus} CPUs`);
    for (let i = 0; i < cpus; i++) {
        cluster.fork();
    }
} else {
    require('./app.js');
}