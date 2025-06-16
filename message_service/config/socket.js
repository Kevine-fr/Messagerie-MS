const { Server } = require('socket.io');

let ioInstance;
const users = new Map(); 
const activeConversations = new Map(); 

module.exports = {
  init: (server) => {
    ioInstance = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN, 
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
      },
    });

    ioInstance.on('connection', (socket) => {
      console.log('🔌 Client connecté :', socket.id);

      // Enregistrement d’un utilisateur avec son socket
      socket.on('register', (userId) => {
        users.set(userId, socket.id);
        console.log(`✅ Utilisateur ${userId} lié au socket ${socket.id}`);
      });

      // L’utilisateur entre dans une conversation avec un autre utilisateur
      socket.on('user_in_conversation', (data) => {
        console.log('🛬 Reçu user_in_conversation :', data);
        const { userId, otherUserId } = data || {};

        if (!userId || !otherUserId) {
          console.warn('⚠️ user_in_conversation reçu avec données incomplètes');
          return;
        }

        if (!activeConversations.has(userId)) {
          activeConversations.set(userId, new Set());
          console.log(`L'utilisateur ${userId} est dans une conversation`)
        }
        activeConversations.get(userId).add(otherUserId);
        socket.emit('user_stay_in_conversation', {
          userId : userId,
          otherUserId: otherUserId
        });
        const otherSocketId = users.get(otherUserId);
          if (otherSocketId) {
            ioInstance.to(otherSocketId).emit('user_stay_in_conversation', {
              userId,
              otherUserId,
            });
          }
        console.log(`🟢 Utilisateur ${userId} discute avec ${otherUserId}`);
      });

      // L’utilisateur quitte une conversation
      socket.on('user_left_conversation', ({ userId, otherUserId }) => {
        if (activeConversations.has(userId)) {
          activeConversations.get(userId).delete(otherUserId);
          if (activeConversations.get(userId).size === 0) {
            activeConversations.delete(userId);
          }
          socket.emit('user_leave_conversation', {
            userId : userId,
            otherUserId: otherUserId
          });
          const otherSocketId = users.get(otherUserId);
          if (otherSocketId) {
            ioInstance.to(otherSocketId).emit('user_leave_conversation', {
              userId,
              otherUserId,
            });
          }
          console.log(`🔴 Utilisateur ${userId} a quitté la discussion avec ${otherUserId}`);
        }
      });

      // Gestion de la déconnexion
      socket.on('disconnect', () => {
        console.log('❌ Déconnexion :', socket.id);

        let disconnectedUserId = null;

        for (const [userId, socketId] of users.entries()) {
          if (socketId === socket.id) {
            users.delete(userId);
            disconnectedUserId = userId;
            console.log(`ℹ️ Utilisateur ${userId} supprimé de la map des sockets`);
            break;
          }
        }

        if (disconnectedUserId) {
          activeConversations.delete(disconnectedUserId);
          console.log(`ℹ️ Utilisateur ${disconnectedUserId} supprimé de la map des conversations actives`);
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

  getUserSocketId: (userId) => {
    return users.get(userId);
  },

  isUserInConversationWith: (userId, otherUserId) => {
    return activeConversations.has(userId) && activeConversations.get(userId).has(otherUserId);
  },
};
