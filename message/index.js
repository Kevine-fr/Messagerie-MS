const express = require('express');
const http = require('http');
require('dotenv').config();
const { connectDB } = require('./config/db');
const socket = require('./config/socket');
const firebase = require('./config/firebase');

// Initialise Firebase Admin (no-op si credentials absents).
firebase.init();

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

// Métriques Prometheus. Monté avant les routes pour couvrir aussi les 404.
// L'endpoint est interne (bloqué publiquement par nginx) : c'est Prometheus
// qui vient le lire depuis le réseau Docker.
const { metricsMiddleware, metricsHandler } = require('./metrics');
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);

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
