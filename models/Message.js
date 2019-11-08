const mongoose = require('mongoose');
const {Schema} = mongoose;

const MessageSchema = new mongoose.Schema({
        conversation: {type: Schema.Types.ObjectId, required: true},
        sender: {type: Schema.Types.ObjectId, ref: 'User', required: true},
        createdAt: {type: Date, required: true},
        content: {type: String, required: true}
    }
);

module.exports = mongoose.model('Message', MessageSchema);