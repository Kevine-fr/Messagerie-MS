const DeviceToken = require('../models/DeviceToken');
const firebase = require('../config/firebase');

/**
 * Envoie une notification push à TOUS les appareils d'un utilisateur, et purge
 * les tokens devenus invalides. No-op si Firebase n'est pas configuré.
 */
async function sendToUser(userId, message) {
  if (!firebase.isEnabled()) return;
  const docs = await DeviceToken.find({ userId: Number(userId) });
  const tokens = docs.map((d) => d.token);
  if (tokens.length === 0) return;

  const { invalidTokens } = await firebase.sendToTokens(tokens, message);
  if (invalidTokens.length > 0) {
    await DeviceToken.deleteMany({ token: { $in: invalidTokens } });
  }
}

module.exports = { sendToUser };
