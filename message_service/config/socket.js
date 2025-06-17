const { Server } = require('socket.io');

let ioInstance;
const users = new Map(); // Map userId => socket.id

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
      
        const roomName = getRoomName(userId, otherUserId);
        socket.join(roomName);
        console.log(`🟢 ${userId} a rejoint la room ${roomName}`);
      
        const room = ioInstance.sockets.adapter.rooms.get(roomName);
        if (room && room.size === 2) {
          ioInstance.to(roomName).emit('both_users_in_room', {
            userId,
            otherUserId,
            room: roomName,
          });
          console.log(`✅ Les utilisateurs ${userId} & ${otherUserId} sont tous les 2 dans la ${roomName}`);
        } else {
          console.log(`⏳ En attente de l'autre utilisateur pour la room ${roomName}`);
        }
      });

      socket.on('user_left_conversation', ({ userId, otherUserId }) => {
        if (!userId || !otherUserId) return;

        const roomName = getRoomName(userId, otherUserId);
        socket.leave(roomName);
        console.log(`🔴 ${userId} a quitté la room ${roomName}`);

        ioInstance.to(roomName).emit('user_leave_conversation', {
          userId,
          otherUserId,
        });
      });

      socket.on('disconnect', () => {
        console.log('❌ Déconnexion :', socket.id);

        const userId = socket.userId;
        if (userId) {
          users.delete(userId);
          console.log(`ℹ️ Utilisateur ${userId} supprimé des sockets`);
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
};

// Fonction utilitaire pour générer un nom de room unique entre 2 utilisateurs
function getRoomName(userA, userB) {
  const sorted = [userA, userB].sort((a, b) => a - b);
  return `conversation_${sorted[0]}_${sorted[1]}`;
}
