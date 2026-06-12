const mongoose = require('mongoose');

// Un token FCM par appareil (un utilisateur peut en avoir plusieurs).
const deviceTokenSchema = new mongoose.Schema({
  userId: { type: Number, required: true, index: true },
  token: { type: String, required: true, unique: true },
  platform: { type: String, default: 'unknown' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
