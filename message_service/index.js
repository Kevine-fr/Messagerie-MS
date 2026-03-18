const express = require('express');
const http = require('http');
const cors = require('cors'); 
require('dotenv').config();
const { connectDB } = require('./config/db');
const socket = require('./config/socket');

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, 
}));

app.use(express.json());

// Routes
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
app.use('/messages', messageRoutes);
app.use('/user', userRoutes);

// Test
app.get('/', (req, res) => {
  res.send('Service Message is running... ✅');
});

// Serveur
const server = http.createServer(app);

// Initialise Socket.IO
socket.init(server);

// Démarre tout
connectDB()
  .then(() => {
    console.log('🟢 Connecté à MongoDB');
    server.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Service Message en ligne sur http://0.0.0.0:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur MongoDB:', err);
  });
