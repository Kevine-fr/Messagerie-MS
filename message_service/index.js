const express = require('express');
require('dotenv').config(); // Charge les variables d'environnement
const { connectDB } = require('./config/db'); // Connexion MongoDB via db.js

const app = express();
const port = process.env.PORT ?? 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Connexion à MongoDB
connectDB().then(() => {
    console.log('🟢 Connecté à MongoDB');
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion à MongoDB:', err);
  });

// Import des routes
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');


// Utilisation des routes
app.use('/messages', messageRoutes);
app.use('/user', userRoutes);


// Route de test
app.get('/', (req, res) => {
  res.send('Service Message is running... ✅');
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`🟢 Service Message is running on http://localhost:${port}`);
});
