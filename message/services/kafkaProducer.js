const { Kafka, Partitioners } = require('kafkajs');

// PLAINTEXT par defaut ; SSL/SASL active uniquement si KAFKA_API_KEY est fourni.
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

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner, 
});
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
