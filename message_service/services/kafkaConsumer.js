require('dotenv').config();
const { Kafka } = require('kafkajs');
const { connectDB } = require('../config/db');
const kafkaHandlers = require('../controllers/kafkaHandlerController');

// Dans l'environnement de Développement, on a besoin de fournir que ces informations //
const kafka = new Kafka({
  clientId: 'nodejs-service',
  brokers: [process.env.KAFKA_URL ?? 'kafka_messagerie:9092'],
});

// Dans l'environnement de Production, on a besoin de fournir que ces informations //
// const kafka = new Kafka({
//   clientId: 'nodejs-service',
//   brokers: [process.env.KAFKA_URL ?? 'kafka_messagerie:9092'],
//   ssl: true,
//   sasl: {
//     mechanism: "plain",
//     username: process.env.API_KEY,
//     password: process.env.API_SECRET
//   }
// });

const consumer = kafka.consumer({ groupId: 'nodejs-consumer-group' });

// 🔁 Mapping topic → handler
const topicHandlers = {
  'user.deleted': kafkaHandlers.handleUserDeleted,
  'user.created': kafkaHandlers.handleUserCreated,
  
  // Je peux ajouter ici d'autres topics à écouter et leurs handlers
};

const run = async () => {
  // Connexion à la base de données MongoDB
// await connectDB()
//     .then(() => {
//       console.log('🟢 Connecté à MongoDB');
//     })
//     .catch((err) => {
//       console.error('❌ Erreur de connexion à MongoDB:', err);
//     });

  await consumer.connect();

  // 🔁 S'abonner à tous les topics définis dans topicHandlers
  for (const topic of Object.keys(topicHandlers)) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`🟢 Abonné au topic "${topic}"`);
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = message.value.toString();
        const data = JSON.parse(value);

        console.log(`📩 Message reçu sur topic "${topic}":`, data);

        const handler = topicHandlers[topic];
        if (handler) {
          await handler(data); // Appel de la fonction correspondante
        } else {
          console.warn(`⚠️ Aucun handler défini pour le topic: ${topic}`);
        }
      } catch (err) {
        console.error(`❌ Erreur traitement message sur topic "${topic}":`, err.message);
      }
    },
  });
};

run().catch(console.error);
