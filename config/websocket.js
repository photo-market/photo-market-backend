const logger = require('./logger');
const WebSocket = require('ws');
const uuidv4 = require('uuid/v4');
const makeClientHandler = require('../service/chatHandler');

/**
 * Initialize the WebSocket server instance
 */
const wss = new WebSocket.Server({noServer: true});

/**
 * Holds connected clients
 */
let clients = [];

/**
 * Invoked for each new websocket connection
 */
wss.on('connection', (ws, req, param) => {
    logger.info(`New websocket client.`);

    ws.isAlive = true;
    ws.connectionId = uuidv4();
    ws.userId = param.userId;
    ws.handleWSEvent = makeClientHandler(sendMessage);

    ws.on('pong', heartbeat);
    ws.on('close', handleClose);
    ws.on('message', handleMessage);

    // Store connection information
    const clientInfo = {
        userId: ws.userId,
        connectionId: ws.connectionId,
        socket: ws
    };
    clients.push(clientInfo);

    // Invoke service
    ws.handleWSEvent({
        action: "$connect",
        data: {
            userId: ws.userId,
            connectionId: ws.connectionId
        }
    });
});

function heartbeat() {
    // noinspection JSUnusedGlobalSymbols
    this.isAlive = true
}

function handleClose() {
    clients = clients.filter(c => c.connectionId !== this.connectionId);
    this.handleWSEvent({
        action: "$disconnect",
        data: {
            userId: this.userId,
            connectionId: this.connectionId
        }
    });
}

function sendMessage(userId, dataObj) {
    clients
        .filter(client => client.userId === userId)
        .forEach(client => {
            logger.info(`Sending websocket message to user ${userId}.`);
            client.socket.send(JSON.stringify(dataObj));
        });
}

/**
 * Acts as a gateway
 */
function handleMessage(messageStr) {
    logger.info('Received message: "%s"', messageStr);

    // Parse input
    let messageObj;
    try {
        messageObj = JSON.parse(messageStr);
    } catch (e) {
        logger.warn(`User ${this.userId} sent invalid JSON.`);
        return;
    }

    // Validate input
    if (!messageObj.action || !messageObj.data) {
        logger.warn(`Someone sent JSON without action and data fields.`);
        return;
    }

    // API MAPPING - can be switched to AWS Websockets Gateway API
    logger.info(JSON.stringify(this));
    this.handleWSEvent({
        action: messageObj.action,
        data: {...messageObj.data, userId: this.userId} // inject userId
    });
}

/**
 * Noop
 */
function noop() {
}

/**
 * Handle upgrade header
 */
function init(server) {
    logger.debug(`Initializing websocket...`);

    // Handle upgrade
    server.on('upgrade', (request, socket, head) => {
        logger.debug('HTTP Upgrade request.');

        // TODO check permissions

        // Make sure that we only handle WebSocket upgrade requests
        if (request.headers['upgrade'] !== 'websocket') {
            socket.end('HTTP/1.1 400 Bad Request');
            return;
        }

        //wss.handleUpgrade(request, socket, head, onSocketConnect);

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request, {
                userId: '5d681c6f7d515f1547fe0c6c'      // TODO USE value from passport js
            });
        });
    });

    // Check all connections once in a while
    setInterval(() => {
        //logger.debug(`Checking if clients are alive.`);
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping(noop);
        });
    }, 30000);
}

module.exports = init;
