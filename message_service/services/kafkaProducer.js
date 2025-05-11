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

const createTopicIfNotExists = async (topic) => {
  try {
    await admin.connect();
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
      await admin.createTopics({
        topics: [{ topic }],
      });
      console.log(`Topic "${topic}" créé avec succès.`);
    }
  } catch (error) {
    console.error('Erreur lors de la création du topic:', error);
  } finally {
    await admin.disconnect();
  }
};

const sendMessage = async (message) => {
  try {
    await producer.connect();
    // Créer le topic si nécessaire
    await createTopicIfNotExists('message.sended');

    // Envoi du message au topic 'message.sended'
    await producer.send({
      topic: 'message.sended',
      messages: [
        {
          value: JSON.stringify(message),
        },
      ],
    });

    console.log(`Message envoyé à Kafka : ${JSON.stringify(message)}`);
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message à Kafka:', error);
  } finally {
    await producer.disconnect();
  }
};

const newMessage = {
  user_id: 1,
  content: 'Ceci est un message.',
  timestamp: new Date().toISOString(),
};

sendMessage(newMessage);
