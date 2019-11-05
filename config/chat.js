/**
 * https://github.com/websockets/ws
 */
const logger = require('./logger');
const WebSocket = require('ws');
const ChatService = require('../service/chat');

/**
 * Initialize the WebSocket server instance
 */
const wss = new WebSocket.Server({noServer: true});

function noop() {
}

function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', (ws, req, param) => {
    logger.info(`New websocket client.`);

    ws.isAlive = true;
    ws.on('pong', heartbeat);

    // connection is up, let's add a simple simple event
    ws.on('message', (message) => {
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
        switch (jsonMessage.action) {
            case 'sendMessage':
                ChatService.sendMessage({userId: ws.userId, ...data}, (res) => {
                    ws.send(JSON.stringify(res));
                });
                break;
            case 'getConversations':
                ChatService.getConversations({userId: ws.userId, ...data}, (res) => {
                    ws.send(JSON.stringify(res));
                });
                break;
            case 'getMessages':
                ChatService.getMessage({userId: ws.userId, ...data}, (res) => {
                    ws.send(JSON.stringify(res));
                });
                break;
            default:
                logger.warn(`Someone sent invalid command.`);
                ws.send(JSON.stringify({error: "Unkown command."}));
        }
    });

    ws.on('close', function close() {
        logger.info('Client disconnected.');
        ChatService.onDisconnect({userId: ws.userId});
    });

    ChatService.onConnect({userId: ws.userId});

    // Send welcome message
    ws.send(JSON.stringify({
        status: 'Hi!',
        date: new Date(),
    }));
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

const init = (server) => {
    logger.debug(`Adding chat...`);

    server.on('upgrade', (request, socket, head) => {
        logger.debug('HTTP Upgrade request.');

        // TODO check permissions

        // Make sure that we only handle WebSocket upgrade requests
        if (request.headers['upgrade'] !== 'websocket') {
            socket.end('HTTP/1.1 400 Bad Request');
            return;
        }

        //wss.handleUpgrade(request, socket, head, onSocketConnect);

        wss.handleUpgrade(request, socket, head, function done(ws) {
            wss.emit('connection', ws, request, {userId: 1});
        });
    });
};

module.exports = init;
