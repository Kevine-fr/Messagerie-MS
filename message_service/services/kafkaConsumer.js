const { Kafka } = require('kafkajs');
const axios = require('axios');  // Pour faire la requête HTTP vers l'API

// Créer un client Kafka
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

// Créer un consommateur
const consumer = kafka.consumer({ groupId: 'nodejs-consumer-group' });

const run = async () => {
  // Connexion au Kafka broker
  await consumer.connect();

  // S'abonner au topic 'user.deleted'
  await consumer.subscribe({ topic: 'user.deleted', fromBeginning: true });

  // Consommer les messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        // Extraire l'objet du message Kafka
        const messageData = JSON.parse(message.value.toString()); // Le message JSON envoyé depuis Laravel
        
        console.log('Message reçu:', messageData); // Log le message pour vérifier sa structure

        // Utilisation directe de user_id sans passer par payload
        const userId = messageData.user_id;

        // Si user_id est undefined, on ne fait rien
        if (!userId) {
          console.log('Erreur: user_id est manquant dans le message.');
          return;
        }

        console.log(`Message reçu pour l'utilisateur supprimé avec user_id : ${userId}`);

        // Faire une requête HTTP pour supprimer les messages de cet utilisateur
        try {
          // Remplacer localhost par le nom du service dans Docker
          const response = await axios.delete(`https://messagerie-ms-h20w.onrender.com/messages/sender/${userId}`);
          console.log('Réponse de la suppression des messages :', response.data);
        } catch (error) {
          console.error('Erreur lors de la suppression des messages:', error);
        }
      } catch (error) {
        console.error('Erreur lors du traitement du message Kafka:', error);
      }
    },
  });
};

run().catch(console.error);
