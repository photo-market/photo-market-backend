const logger = require('./logger');
const WebSocket = require('ws');
const uuidv4 = require('uuid/v4');
const handleEvent = require('../service/chatHandler');

/**
 * Initialize the WebSocket server instance
 */
const wss = new WebSocket.Server({noServer: true});
let clients = [];

wss.on('connection', (ws, req, param) => {
    logger.info(`New websocket client.`);

    ws.isAlive = true;
    ws.connectionId = uuidv4();
    ws.userId = param.userId;

    const data = {
        userId: param.userId,
        connectionId: ws.connectionId
    };

    ws.on('pong', () => ws.isAlive = true);
    ws.on('message', (message) => handleMessage(ws, message));
    ws.on('close', () => {
        clients = clients.filter(c => c.connectionId !== ws.connectionId);
        handleEvent({action: '$disconnect', data}, ws);
    });

    clients.push({
        connectionId: ws.connectionId,
        userId: ws.userId,
        ws
    });
    handleEvent({action: '$connect', data}, ws);
});

/**
 * Acts as a gateway
 */
function handleMessage(ws, message) {
    logger.debug('Received message: %s', message);

    // Parse input
    let jsonMessage;
    try {
        jsonMessage = JSON.parse(message);
    } catch (e) {
        logger.warn(`User ${ws.userId} sent invalid JSON.`);
        ws.send(JSON.stringify({error: "Invalid JSON payload."}));
        return;
    }

    // Validate input
    const {action, data} = jsonMessage;
    if (!action || !data) {
        logger.warn(`Someone sent JSON without action and data fields.`);
        ws.send(JSON.stringify({error: "Payload must contain action and data fields."}));
        return;
    }

    // Routing
    jsonMessage.data.userId = ws.userId;
    handleEvent(jsonMessage, ws);
}

function noop() {
}

function init(server) {
    logger.debug(`Initializing chat...`);

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
                userId: '5d681c6f7d515f1547fe0c6c'      /// TODO USE value from passport js
            });
        });
    });

    // Check all connections once in a while
    setInterval(() => {
        logger.debug(`Checking if clients are alive.`);

        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping(noop);
        });

    }, 30000);
}

module.exports = init;
