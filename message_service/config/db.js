const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI ?? "mongodb://localhost:27017/messagerie", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connecté : ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Erreur de connexion MongoDB : ${err.message}`);
    process.exit(1); // Arrêter le processus si la connexion échoue
  }
};

module.exports = { connectDB };
