const logger = require('../config/logger');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');


exports.getStatus = function (data) {
    // get status in db
};

exports.onConnect = function (data) {
    // update user status in db
};

exports.onDisconnect = function (data) {
    // set use status in db to offline
};

exports.sendMessage = function (data, callback) {

    const newMsg = new Message({
        conversationId: data.conversationId,
        body: data.composedMessage,
        author: data.userId
    });

    newMsg.save(function (err, sentReply) {
        if (err) {
            logger.error(`Can't save message!`);
            callback({error: err});
        } else {
            callback({message: 'Reply successfully sent!'});
        }
    });

};

exports.getConversations = function (req, res, next) {
    // Only return one message from each conversation to display as snippet
    Conversation.find({participants: req.user._id})
        .select('_id')
        .exec((err, conversations) => {
            if (err) {
                res.send({error: err});
                return next(err);
            }

            // Set up empty array to hold conversations + most recent message
            let fullConversations = [];
            conversations.forEach((conversation) => {
                Message.find({'conversationId': conversation._id})
                    .sort('-createdAt')
                    .limit(1)
                    .populate({
                        path: "author",
                        select: "profile.firstName profile.lastName"
                    })
                    .exec((err, message) => {
                        if (err) {
                            res.send({error: err});
                            return next(err);
                        }
                        fullConversations.push(message);
                        if (fullConversations.length === conversations.length) {
                            return res.status(200).json({conversations: fullConversations});
                        }
                    });
            });
        });
};

exports.getMessage = function (data) {
    Message.find({conversationId: req.params.conversationId})
        .select('createdAt body author')
        .sort('-createdAt')
        .populate({
            path: 'author',
            select: 'profile.firstName profile.lastName'
        })
        .exec((err, messages) => {
            if (err) {
                res.send({error: err});
                return next(err);
            }

            res.status(200).json({conversation: messages});
        });
};

exports.newConversation = function (req, res, next) {
    if (!req.params.recipient) {
        res.status(422).send({error: 'Please choose a valid recipient for your message.'});
        return next();
    }

    if (!req.body.composedMessage) {
        res.status(422).send({error: 'Please enter a message.'});
        return next();
    }

    const conversation = new Conversation({
        participants: [req.user._id, req.params.recipient]
    });

    conversation.save(function (err, newConversation) {
        if (err) {
            res.send({error: err});
            return next(err);
        }

        const message = new Message({
            conversationId: newConversation._id,
            body: req.body.composedMessage,
            author: req.user._id
        });

        message.save(function (err, newMessage) {
            if (err) {
                res.send({error: err});
                return next(err);
            }

            res.status(200).json({message: 'Conversation started!', conversationId: conversation._id});
            return next();
        });
    });
};
