const express = require('express');
const ChatController = require('../controllers/chat');

const chatRoutes = express.Router();

// Route specific middleware
chatRoutes.use((req, res) => {

});

chatRoutes.post('/connect', ChatController.onConnect);
chatRoutes.post('/disconnect', ChatController.onDisconnect);
chatRoutes.get('/:userId/status', ChatController.getStatus);

chatRoutes.get('/conversations', ChatController.getConversations);
chatRoutes.get('/conversations/:conversationId', ChatController.getConversation);
chatRoutes.post('/conversations/:conversationId', ChatController.sendMessage);
chatRoutes.post('/conversations/new/:recipient', ChatController.newConversation);

module.exports = chatRoutes;