const mongoose = require('mongoose');
const {Schema} = mongoose;

const conversationSchema = new Schema({
    participants: [{type: Schema.Types.ObjectId, ref: 'User'}],
    lastMessage: {type: String},
    lastMessageTime: {type: Date},
});

module.exports = mongoose.model('Conversation', conversationSchema);