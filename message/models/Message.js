const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: Number, required: true },
  receiverId: { type: Number, required: true },
  content: { type: String, required: true },
  type: { type: String, default: "Text" },
  isRead: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
