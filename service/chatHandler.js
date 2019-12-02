const logger = require('../config/logger');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

function makeClientHandler(sendEvent) {

    function _updateLastSeen(data) {
        if (!data.userId) {
            return Promise.reject(`UserId is required.`);
        }
        return User.findById(data.userId).exec()
            .then((user) => {
                user.lastSeen = new Date();
                return user.save();
            });
    }

    function $connect(data) {
        return _updateLastSeen(data);
    }

    function $disconnect(data) {
        return _updateLastSeen(data);
    }

    // {"action": "sendMessage", "data": {"uuid":"1231sdf", "conversationId": "5dc5d37d6bac33152964af9f", "content": "Hello world"}}
    async function sendMessage(data) {
        if (!data.uuid || !data.userId || !data.conversationId || !data.content) {
            logger.warn(`Incorrect input prarams.`);
            return Promise.reject({error: 'Incorrect request.'});
        }

        const senderId = data.userId;

        // Check such conversation
        const conversation = await Conversation.findById(data.conversationId);
        if (!conversation || !conversation.participants.some(p => String(p._id) === data.userId)) {
            logger.warn(`No such conversation or user doesn't belong to this conversation.`);
            return;
        }

        const saveMessage = (message) => {
            logger.info(`Saving message.`);
            return message.save();
        };

        const updateLastMessage = (message) => {
            logger.info(`Updating last message in conversation.`);
            message.conversation.lastMessage = message.content;
            message.conversation.lastMessageTime = message.createdAt;
            return message.save();
        };

        const notifyOthers = async (message) => {
            logger.info(`Notifying others about new message.\n` + JSON.stringify(message));
            try {
                conversation.participants
                    .filter(user => String(user._id) !== data.userId)
                    .forEach(user => {
                        logger.info(`Send message to ${user._id}.`);
                        sendEvent(String(user._id), {
                            action: "NEW_MESSAGE",
                            messageId: String(message._id),
                            content: data.content,
                            conversationId: data.conversationId,
                            senderId: data.userId,
                        });
                    });
            } catch (e) {
                logger.error(`Can't notify others.\n` + JSON.stringify(e));
            }
            return Promise.resolve(message);
        };

        const success = (message) => {
            logger.info(`Sending result to the user back.`);
            sendEvent(senderId, {
                action: `messageSent`,
                data: {
                    uuid: data.uuid,
                    messageId: message._id,
                    message: `Reply successfully sent!`,
                }
            });
            return Promise.resolve(message);
        };

        const fail = (err) => {
            logger.warn(err);
            return ({
                action: `sendMessage`,
                data: {
                    uuid: data.uuid,
                    message: `Can't save message.`,
                }
            })
        };

        const newMsg = new Message({
            uuid: data.uuid,
            conversation: data.conversationId,
            sender: data.userId,
            createdAt: new Date().toISOString(),
            content: data.content,
        });

        return saveMessage(newMsg)
            .then(updateLastMessage)
            .then(notifyOthers)
            .then(success)
            .catch(fail);
    }

    /**
     * MOVE IT TO HTTP?
     *   {"action": "createConversation", "data": {"uuid": "sfdae3223", "recipientId": "5d681ca935c2e215975a373a"}}
     */
    async function createConversation(data) {
        logger.info(`Creating conversation. \n` + JSON.stringify(data));

        if (!data.userId || !data.recipientId) {
            return Promise.reject({error: 'userId and recipientId are required.'});
        }

        // Check if we already have such conversation?
        const existingConversation = await Conversation.find({participants: [data.userId, data.recipientId]}).exec();
        if (existingConversation.length > 0) {
            sendEvent(data.userId, {
                action: `createConversation`,
                data: {
                    message: 'Conversation already exist.',
                    uuid: data.uuid,
                    conversationId: existingConversation[0]._id
                }
            });
            return Promise.resolve("Conversation already exist.");
        }

        const conversation = new Conversation({
            participants: [data.userId, data.recipientId],
            lastMessage: "",
            lastMessageTime: ""
        });

        return conversation.save()
            .then((dbConversation) => {
                sendEvent(data.userId, {
                    action: `createConversation`,
                    data: {
                        message: 'Conversation created.',
                        uuid: data.uuid,
                        conversationId: dbConversation._id
                    }
                });
                return "New conversation saved in the DB.";
            }).catch((e) => {
                logger.warn(`Can't save new conversation.\n${JSON.stringify(e)}`);
                return e;
            });
    }

    /**
     * MOVE IT TO HTTP?
     */
    function getConversations(data) {
        const {userId} = data;

        if (!userId) {
            return Promise.reject({error: 'Incorrect request.'});
        }

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

    /**
     * MOVE IT TO HTTP?
     */
    function getMessages() {
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

    // Acts a role of API mapping
    function handleEvent(req) {
        const actions = {
            '$connect': $connect,
            '$disconnect': $disconnect,
            'sendMessage': sendMessage,
            // do via http?
            'createConversation': createConversation,
            'getConversations': getConversations,
            'getMessages': getMessages,
        };

        if (!actions[req.action]) {
            return Promise.reject(`Unknown action type "${req.action}".`)
        }

        actions[req.action](req.data)
            .then((res) => {
                logger.info(`Task "${req.action}" successfully done. Details: \n` + JSON.stringify(res));
            })
            .catch((err) => {
                logger.error(err);
            });
    }

    return handleEvent;
}

module.exports = makeClientHandler;
