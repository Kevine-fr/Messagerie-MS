const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'nodejs-service',
  brokers: [process.env.KAFKA_URL],
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: process.env.API_KEY,
    password: process.env.API_SECRET
  }
});

const producer = kafka.producer();
const admin = kafka.admin();

/**
 * Crée un topic s'il n'existe pas déjà.
 * @param {string} topic - Nom du topic à créer
 */
const createTopicIfNotExists = async (topic) => {
  try {
    await admin.connect();
    const topics = await admin.listTopics();

    if (!topics.includes(topic)) {
      await admin.createTopics({
        topics: [{ topic }],
      });
      console.log(`✅ Topic "${topic}" créé.`);
    }
  } catch (error) {
    console.error('❌ Erreur création topic Kafka:', error);
  } finally {
    await admin.disconnect();
  }
};

/**
 * Envoie un message à un topic (créé automatiquement si nécessaire).
 * @param {string} topic - Nom du topic
 * @param {Object} payload - Données à envoyer
 */
const sendToKafka = async (topic, payload) => {
  try {
    await createTopicIfNotExists(topic);
    await producer.connect();

    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });

    console.log(`📤 Message envoyé à "${topic}" :`, payload);
  } catch (error) {
    console.error('❌ Erreur envoi Kafka:', error);
  } finally {
    await producer.disconnect();
  }
};

module.exports = {
  sendToKafka,
};
