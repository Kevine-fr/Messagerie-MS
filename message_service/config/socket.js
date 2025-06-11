let ioInstance;
const users = new Map(); // user_id -> socket.id

module.exports = {
  init: (server) => {
    const { Server } = require('socket.io');
    ioInstance = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'DELETE', 'PUT'],
      },
    });

    ioInstance.on('connection', (socket) => {
      console.log('🔌 Client connecté :', socket.id);

      // Enregistrement de l'utilisateur
      socket.on('register', (userId) => {
        users.set(userId, socket.id);
        console.log(`✅ Utilisateur ${userId} lié au socket ${socket.id}`);
      });

      // Nettoyage à la déconnexion
      socket.on('disconnect', () => {
        console.log('❌ Déconnexion :', socket.id);
        for (const [userId, socketId] of users.entries()) {
          if (socketId === socket.id) {
            users.delete(userId);
            console.log(`ℹ️ Utilisateur ${userId} supprimé de la map`);
            break;
          }
        }
      });
    });

    return ioInstance;
  },

  getIO: () => {
    if (!ioInstance) {
      throw new Error('Socket.io not initialized!');
    }
    return ioInstance;
  },

  getUserSocketId: (userId) => {
    return users.get(userId);
  },
};
