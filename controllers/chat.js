const validator = require('validator');
const User = require('../models/User');

/**
 * GET /chat/conversations
 * Returns the list of all recent conversations
 */
exports.getConversations = (req, res) => {

    //

    return 'info';
};

/**
 * POST /chat/conversations
 * Create new conversation
 */
exports.startConversation = (req, res) => {

    // Check if we already have such conversation

    // if yes - return existing id

    // if no - create and return new id

};

/**
 * GET /chat/conversations/:conversationId?offset=0
 * Default page size: 20
 */
exports.getMessages = (req, res) => {
    // return pagination
    return [];
};


// events:
// SEND_MESSAGE? do it by http?
// NEW_CONVERSATION
// NEW_MESSAGE

