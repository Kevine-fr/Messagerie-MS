require('dotenv').config();
const { Kafka } = require('kafkajs');
const { connectDB } = require('../config/db');
const kafkaHandlers = require('../controllers/kafkaHandlerController');

// Configuration Kafka : PLAINTEXT par defaut (Kafka auto-heberge),
// SSL/SASL active automatiquement si KAFKA_API_KEY est fourni (Confluent Cloud, etc.).
const brokers = (process.env.KAFKA_URL ?? 'kafka:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafkaConfig = {
  clientId: 'nodejs-service',
  brokers,
};

if (process.env.KAFKA_API_KEY) {
  kafkaConfig.ssl = true;
  kafkaConfig.sasl = {
    mechanism: 'plain',
    username: process.env.KAFKA_API_KEY,
    password: process.env.KAFKA_API_SECRET,
  };
}

const kafka = new Kafka(kafkaConfig);

const consumer = kafka.consumer({ groupId: 'nodejs-consumer-group' });

const topicHandlers = {
  'user.deleted': kafkaHandlers.handleUserDeleted,
  'user.created': kafkaHandlers.handleUserCreated,
  'user.updated': kafkaHandlers.handleUserUpdated,
  };

const run = async () => {
  // Connexion à la base de données MongoDB
await connectDB()
    .then(() => {
      console.log('🟢 Connecté à MongoDB');
    })
    .catch((err) => {
      console.error('❌ Erreur de connexion à MongoDB:', err);
    });

  await consumer.connect();

  for (const topic of Object.keys(topicHandlers)) {
    await consumer.subscribe({ topic, fromBeginning: true, allowAutoTopicCreation: true });
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
          await handler(data); 
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
