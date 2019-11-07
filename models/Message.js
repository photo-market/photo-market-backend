const mongoose = require('mongoose');
const {Schema} = mongoose;

const MessageSchema = new mongoose.Schema({
        conversationId: {type: Schema.Types.ObjectId, required: true},
        senderId: {type: Schema.Types.ObjectId, ref: 'User', required: true},
        createdAt: {type: Date, required: true},
        content: {type: String, required: true}
    }
);

module.exports = mongoose.model('Message', MessageSchema);