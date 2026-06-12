const { Server } = require('socket.io');
const User = require('../models/User');
const pushSender = require('../services/pushSender');

let ioInstance;
// userId (Number) -> socketId
const users = new Map();

// Push "X est en train d'écrire…" quand le destinataire n'a aucun socket
// (app fermée / arrière-plan sans connexion). Façon Snapchat.
async function sendTypingPush(fromUserId, toUserId) {
  try {
    const sender = await User.findOne({ user_id: Number(fromUserId) });
    const name = (sender && sender.name) || 'Quelqu’un';
    await pushSender.sendToUser(toUserId, {
      notification: { title: name, body: 'est en train d’écrire…' },
      data: { type: 'typing', senderId: String(fromUserId), senderName: name },
      collapseKey: `typing_${fromUserId}`,
      ttl: 20000,
      priority: 'high',
    });
  } catch (err) {
    console.error('Push typing échoué :', err.message);
  }
}

// Origines autorisees (separees par des virgules). La gateway reste la couche CORS
// principale ; cette configuration est defensive pour les acces directs.
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.includes('*');

function getRoomName(userA, userB) {
  const sorted = [Number(userA), Number(userB)].sort((a, b) => a - b);
  return `conversation_${sorted[0]}_${sorted[1]}`;
}

function onlineUserIds() {
  return Array.from(users.keys());
}

// Informe TOUS les clients de la liste a jour des utilisateurs en ligne.
function broadcastOnlineUsers() {
  if (ioInstance) ioInstance.emit('onlineUsers', onlineUserIds());
}

// Fait quitter une room et previent le pair restant que l'utilisateur est sorti.
function leaveConversationRoom(socket, roomName) {
  const pair = socket.conversations.get(roomName);
  socket.leave(roomName);
  socket.conversations.delete(roomName);
  if (pair) {
    // `socket.to` = tout le monde dans la room SAUF l'emetteur.
    socket.to(roomName).emit('user_leave_conversation', pair);
    socket.to(roomName).emit('peer_stop_typing', pair);
  }
}

module.exports = {
  init: (server) => {
    ioInstance = new Server(server, {
      cors: {
        origin: allowAllOrigins ? '*' : allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: !allowAllOrigins,
      },
      // Detecte plus vite les coupures (tel eteint / reseau perdu / app tuee) :
      // sans ping recu pendant pingTimeout apres un pingInterval, le serveur
      // declenche `disconnect` -> on previent les pairs et on met a jour la presence.
      pingInterval: 10000,
      pingTimeout: 15000,
    });

    ioInstance.on('connection', (socket) => {
      console.log('🔌 Client connecté :', socket.id);

      // Rooms de conversation rejointes par CE socket :
      // roomName -> { userId, otherUserId } (utile pour notifier a la deconnexion).
      socket.conversations = new Map();

      socket.on('register', (rawUserId) => {
        const userId = Number(rawUserId);
        if (!userId) return;

        // Si l'utilisateur avait deja un autre socket (reconnexion / multi-onglet),
        // on remplace simplement par le plus recent.
        users.set(userId, socket.id);
        socket.userId = userId;
        console.log(`✅ Utilisateur ${userId} lié au socket ${socket.id}`);

        // Liste complete pour le nouveau venu + diffusion a tout le monde.
        socket.emit('onlineUsers', onlineUserIds());
        broadcastOnlineUsers();
      });

      socket.on('user_in_conversation', ({ userId, otherUserId }) => {
        if (!userId || !otherUserId) {
          console.warn('⚠️ Données incomplètes pour user_in_conversation');
          return;
        }

        const roomName = getRoomName(userId, otherUserId);
        socket.join(roomName);
        socket.conversations.set(roomName, {
          userId: Number(userId),
          otherUserId: Number(otherUserId),
        });
        console.log(`🟢 ${userId} a rejoint la room ${roomName}`);

        const room = ioInstance.sockets.adapter.rooms.get(roomName);
        if (room && room.size === 2) {
          ioInstance.to(roomName).emit('both_users_in_room', {
            userId,
            otherUserId,
            room: roomName,
          });
          console.log(`✅ ${userId} & ${otherUserId} sont tous les 2 dans ${roomName}`);
        } else {
          console.log(`⏳ En attente de l'autre utilisateur pour la room ${roomName}`);
        }
      });

      socket.on('user_left_conversation', ({ userId, otherUserId }) => {
        if (!userId || !otherUserId) return;
        const roomName = getRoomName(userId, otherUserId);
        leaveConversationRoom(socket, roomName);
        console.log(`🔴 ${userId} a quitté la room ${roomName}`);
      });

      // Indicateur « est en train d'ecrire » — envoye DIRECTEMENT au socket du
      // destinataire (pas a la room) : ainsi il le recoit aussi bien dans la
      // conversation que sur la liste des discussions (facon WhatsApp), meme
      // s'il n'a pas (encore) rejoint la room.
      socket.on('typing', ({ userId, otherUserId }) => {
        if (!userId || !otherUserId) return;
        const targetSocketId = users.get(Number(otherUserId));
        if (targetSocketId) {
          ioInstance.to(targetSocketId).emit('peer_typing', { userId, otherUserId });
        } else {
          // Destinataire sans socket actif -> notification push.
          sendTypingPush(userId, otherUserId);
        }
      });

      socket.on('stop_typing', ({ userId, otherUserId }) => {
        if (!userId || !otherUserId) return;
        const targetSocketId = users.get(Number(otherUserId));
        if (targetSocketId) {
          ioInstance.to(targetSocketId).emit('peer_stop_typing', { userId, otherUserId });
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Déconnexion :', socket.id, `(${reason})`);

        // Previent les pairs de CHAQUE conversation que l'utilisateur est sorti,
        // meme en cas de coupure brutale (reseau / app tuee / tel eteint).
        for (const roomName of Array.from(socket.conversations.keys())) {
          leaveConversationRoom(socket, roomName);
        }

        const userId = socket.userId;
        // Ne retire de la presence que si CE socket est bien le socket courant de
        // l'utilisateur (evite de le marquer hors ligne apres une reconnexion).
        if (userId && users.get(userId) === socket.id) {
          users.delete(userId);
          console.log(`ℹ️ Utilisateur ${userId} hors ligne`);
          broadcastOnlineUsers();
        }
      });
    });

    return ioInstance;
  },

  getIO: () => {
    if (!ioInstance) {
      throw new Error('Socket.io non initialisé !');
    }
    return ioInstance;
  },

  getUserSocketId: (userId) => users.get(Number(userId)),

  getRoomName,
};
