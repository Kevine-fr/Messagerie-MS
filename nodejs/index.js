const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config(); // Assure-toi d’avoir un fichier .env
const app = express();
const port = process.env.PORT || 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Connexion à MongoDB
// index.js
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connecté à MongoDB'))
  .catch(err => console.error('❌ Erreur MongoDB :', err));

// Import des routes
const messageRoutes = require('./routes/messages');

// Utilisation des routes
app.use('/messages', messageRoutes);

// Route de test
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`🚀 Serveur en écoute sur http://localhost:${port}`);
});
