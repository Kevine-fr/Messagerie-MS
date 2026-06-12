const admin = require('firebase-admin');

let enabled = false;

/**
 * Initialise Firebase Admin si des credentials sont fournis, sinon désactive
 * proprement les push (le service tourne sans Firebase).
 *
 * Deux façons de fournir les credentials :
 *  - GOOGLE_APPLICATION_CREDENTIALS = chemin vers le service-account JSON, ou
 *  - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.
 */
function init() {
  if (admin.apps.length) {
    enabled = true;
    return;
  }
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
      enabled = true;
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Les "\n" littéraux d'une variable d'env mono-ligne -> vrais retours.
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      enabled = true;
    } else {
      console.warn('⚠️ Firebase non configuré : notifications push désactivées.');
    }
    if (enabled) console.log('🔥 Firebase Admin initialisé (push activées).');
  } catch (err) {
    console.error('❌ Init Firebase Admin échouée :', err.message);
    enabled = false;
  }
}

/**
 * Envoie une notification à plusieurs tokens. Renvoie la liste des tokens
 * invalides (à purger).
 */
async function sendToTokens(tokens, message) {
  if (!enabled || !Array.isArray(tokens) || tokens.length === 0) {
    return { invalidTokens: [] };
  }

  // Les valeurs de `data` doivent toutes être des chaînes.
  const data = {};
  for (const [k, v] of Object.entries(message.data || {})) {
    data[k] = v == null ? '' : String(v);
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: message.notification,
    data,
    android: {
      priority: message.priority || 'high',
      ...(message.ttl ? { ttl: message.ttl } : {}),
      ...(message.collapseKey ? { collapseKey: message.collapseKey } : {}),
    },
    apns: message.collapseKey
      ? { headers: { 'apns-collapse-id': message.collapseKey } }
      : undefined,
  });

  const invalidTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      const code = (r.error && r.error.code) || '';
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token') ||
        code.includes('invalid-argument')
      ) {
        invalidTokens.push(tokens[i]);
      }
    }
  });
  return { invalidTokens };
}

module.exports = { init, isEnabled: () => enabled, sendToTokens };
