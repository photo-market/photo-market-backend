const mongoose = require('mongoose');
const {Schema} = mongoose;

const conversationSchema = new Schema({
    participants: [{type: Schema.Types.ObjectId, ref: 'User'}],
    // producerId: String,
    // consumerId: String,
    lastMessage: String,
    lastMessageTime: Date,
});

module.exports = mongoose.model('Conversation', conversationSchema);