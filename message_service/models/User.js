const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true },
  name: { type: String, required: true },
  photo: { type: String, required: false }
},
{
  timestamps: true
});

module.exports = mongoose.model('User', userSchema, 'user-cached');
