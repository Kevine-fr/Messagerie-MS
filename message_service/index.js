const express = require('express');
const http = require('http');
require('dotenv').config();
const { connectDB } = require('./config/db');
const socket = require('./config/socket');

const app = express();
const port = process.env.PORT ?? 3000;

// Middleware JSON
app.use(express.json());

// Routes (import)
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

// Routes
app.use('/messages', messageRoutes);
app.use('/user', userRoutes);

// Route test
app.get('/', (req, res) => {
  res.send('Service Message is running... ✅');
});

// Serveur HTTP
const server = http.createServer(app);

// Initialisation Socket.IO via socket.js
const io = socket.init(server);

io.on('connection', (socket) => {
  console.log('🔌 Un client est connecté :', socket.id);

  socket.on('send_message', (data) => {
    console.log('Message reçu:', data);
    io.emit('receive_message', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client déconnecté:', socket.id);
  });
});

// Connexion DB et démarrage serveur
connectDB()
  .then(() => {
    console.log('🟢 Connecté à MongoDB');
    server.listen(port, '0.0.0.0', () => {
      console.log(`🟢 Service Message is running on http://0.0.0.0:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion à MongoDB:', err);
  });
