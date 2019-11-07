const logger = require('../config/logger');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

function $connect(data) {
    if (!data.userId || !data.connectionId) {
        return Promise.reject(`UserId and ConnectionId is required.`);
    }
    return User.findById(data.userId).exec()
        .then((dbUser) => {
            if (!dbUser.connectionIds) dbUser.connectionIds = [data.connectionId];
            else dbUser.connectionIds.push(data.connectionId);
            dbUser.save();
        })
}

function $disconnect(data) {
    if (!data.userId || !data.connectionId) {
        return Promise.reject(`UserId and ConnectionId is required.`);
    }
    return User.findById(data.userId).exec()
        .then((user) => {
            user.lastSeen = new Date();
            user.connectionIds = user.connectionIds.filter(cid => cid !== data.connectionId);
            return user.save();
        });
}

//  {"action": "createConversation", "data": {"uuid": "sfdae3223", "recipientId": "5d681ca935c2e215975a373a"}}
async function handleCreateConversation(data) {
    if (!data.userId || !data.recipientId) {
        return Promise.reject({error: 'Incorrect request'});
    }

    // Check if we already have such conversation?
    const existingConversation = await Conversation.find({participants: [data.userId, data.recipientId]}).exec();
    if (existingConversation.length > 0) {
        return Promise.resolve({
            action: `createConversation`,
            data: {
                message: 'Ok',
                uuid: data.uuid,
                conversationId: existingConversation[0]._id
            }
        });
    }

    const conversation = new Conversation({
        participants: [data.userId, data.recipientId],
        lastMessage: "",
        lastMessageTime: ""
    });

    return conversation.save()
        .then((dbConversation) => {
            return {
                action: `createConversation`,
                data: {
                    message: 'Ok',
                    uuid: data.uuid,
                    conversationId: dbConversation._id
                }
            }
        }).catch((e) => {
            logger.warn(`handleCreateConversation: Service returned error.\n${JSON.stringify(e)}`);
            return e;
        });
}

// {"action": "sendMessage", "data": {"uuid":"1231sdf", "conversationId": "5dc3ad9201e6e603455a665a", "senderId": "5d681c6f7d515f1547fe0c6c", "content": "Hello world"}}
function handleSendMessage(data) {
    if (!data.uuid || !data.senderId || !data.content) {
        logger.warn(`Incorrect input prarams.`);
        return Promise.reject({error: 'Incorrect request.'});
    }

    const saveMessage = (message) => {
        return message.save();
    };

    const updateLastMessage = (message) => {
        return Conversation.findById(message.conversationId).exec()
            .then((dbConversation) => {
                dbConversation.lastMessage = message.content;
                dbConversation.lastMessageTime = message.createdAt;
                return dbConversation.save().then(() => ({message: message, conversation: dbConversation}));
            })
    };

    const notifyOthers = (message, conversation) => {
        logger.info(conversation.participants);
        conversation.participants.filter(user => user._id !== data.senderId).forEach(user => {
            // send message
            logger.info(`send message to ${user.connectionIds}`);
        });
    };

    const success = (message) => ({
        action: `sendMessage`,
        data: {
            message: 'Reply successfully sent!',
            messageId: message._id,
            uuid: message.uuid
        }
    });

    const fail = (err) => {
        logger.warn(err);
        return ({
            action: `sendMessage`,
            data: {
                message: `Can't save message.`,
                // messageId: message._id,
                // uuid: message.uuid
            }
        })
    };

    // Save message
    const newMsg = new Message({
        conversationId: data.conversationId,
        uuid: data.uuid,
        createdAt: Date.now(),
        senderId: data.senderId,
        recipientId: data.recipient,
        content: data.content,
    });

    return saveMessage(newMsg)
        .then(updateLastMessage)
        .then(notifyOthers)
        .then(success)
        .catch(fail);
}

function handleGetConversations(data) {
    const {userId} = data;

    // Validation
    if (!userId) {
        return Promise.reject({error: 'Incorrect request.'});
    }

    // Only return one message from each conversation to display as snippet
    const getConversations = (userId) => Conversation.find({participants: userId}).exec();

    const success = (conversations) => ({
        action: `getConversations`,
        data: {
            message: `Ok`,
            conversations: conversations
        }
    });

    const fail = () => ({
        action: `getConversations`,
        data: {
            message: `Can't get conversations.`,
        }
    });

    return getConversations(data.userId)
        .then(success)
        .catch(fail);

}

function handleGetMessages() {
    const {conversationId} = data;

    Message.find({conversationId: conversationId})
        .select('createdAt body author')
        .sort('-createdAt')
        .populate({
            path: 'author',
            select: 'profile.firstName profile.lastName'
        })
        .exec((err, messages) => {
            if (err) {
                callback({error: err});
                return;
            }
            callback({conversation: messages});
        });
}

module.exports = (req, ws) => {
    if (!req || !ws) {
        return Error("Req and ws are required.");
    }

    // req = {action, data}
    const actions = {
        '$connect': $connect,
        '$disconnect': $disconnect,
        'createConversation': handleCreateConversation,
        'getConversations': handleGetConversations,
        'getMessages': handleGetMessages,
        'sendMessage': handleSendMessage
    };

    if (!actions[req.action]) {
        return Promise.reject(`Unknown action type "${req.actions}".`)
    }

    actions[req.action](req.data)
        .then((res) => {
            if (res) ws.send(JSON.stringify(res));
        })
        .catch((err) => {
            logger.error(err);
        });
};
