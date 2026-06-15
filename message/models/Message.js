const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: Number, required: true },
  receiverId: { type: Number, required: true },
  // Texte du message OU légende d'un média. Optionnel pour un média sans légende.
  content: { type: String, default: '' },
  // text | image | video | file (audio réservé pour plus tard).
  type: { type: String, default: 'text' },
  // Métadonnées média (renseignées quand type !== 'text').
  mediaUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  publicId: { type: String },
  isRead: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true
});

// Index pour accélérer la pagination des conversations et l'agrégation de la
// liste des discussions (filtres par expéditeur/destinataire + non-lus).
messageSchema.index({ senderId: 1, receiverId: 1 });
messageSchema.index({ receiverId: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);
