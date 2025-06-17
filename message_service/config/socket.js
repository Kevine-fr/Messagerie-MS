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

      socket.on('register', (userId) => {
        users.set(userId, socket.id);
        socket.userId = userId;
        console.log(`✅ Utilisateur ${userId} lié au socket ${socket.id}`);
      });

      socket.on('user_in_conversation', ({ userId, otherUserId }) => {
        if (!userId || !otherUserId) {
          console.warn('⚠️ Données incomplètes pour user_in_conversation');
          return;
        }

        if (!activeConversations.has(userId)) {
          activeConversations.set(userId, new Set());
        }
        activeConversations.get(userId).add(otherUserId);

        const payload = { userId, otherUserId };
        socket.emit('user_stay_in_conversation', payload);

        const otherSocketId = users.get(otherUserId);
        if (otherSocketId) {
          ioInstance.to(otherSocketId).emit('user_stay_in_conversation', payload);
        }

        console.log(`🟢 ${userId} discute avec ${otherUserId}`);
      });

      socket.on('ask_user_in_conversation', ({ from, to }) => {
        if (!from || !to) return;

        // Simplification : le serveur répond directement
        const isInConversation =
          activeConversations.has(to) &&
          activeConversations.get(to).has(from);

        socket.emit('reply_user_in_conversation', { isInConversation });
      });

      socket.on('user_left_conversation', ({ userId, otherUserId }) => {
        if (!userId || !otherUserId) return;

        if (activeConversations.has(userId)) {
          const set = activeConversations.get(userId);
          set.delete(otherUserId);
          if (set.size === 0) {
            activeConversations.delete(userId);
          }

          const payload = { userId, otherUserId };
          socket.emit('user_leave_conversation', payload);

          const otherSocketId = users.get(otherUserId);
          if (otherSocketId) {
            ioInstance.to(otherSocketId).emit('user_leave_conversation', payload);
          }

          console.log(`🔴 ${userId} a quitté la discussion avec ${otherUserId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ Déconnexion :', socket.id);

        let disconnectedUserId = null;
        for (const [userId, socketId] of users.entries()) {
          if (socketId === socket.id) {
            users.delete(userId);
            disconnectedUserId = userId;
            console.log(`ℹ️ Utilisateur ${userId} supprimé des sockets`);
            break;
          }
        }

        if (disconnectedUserId) {
          const set = activeConversations.get(disconnectedUserId);
          if (set) {
            for (const otherUserId of set) {
              const otherSocketId = users.get(otherUserId);
              if (otherSocketId) {
                ioInstance.to(otherSocketId).emit('user_leave_conversation', {
                  userId: disconnectedUserId,
                  otherUserId,
                });
              }
            }
          }
          activeConversations.delete(disconnectedUserId);
          console.log(`ℹ️ Conversations supprimées pour ${disconnectedUserId}`);
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

  getUserSocketId: (userId) => users.get(userId),

  isUserInConversationWith: (userId, otherUserId) =>
    activeConversations.has(userId) &&
    activeConversations.get(userId).has(otherUserId),
};
