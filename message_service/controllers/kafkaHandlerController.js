const messageController = require('./messageController');
const userController = require('./userController');

const axios = require('axios');

const message_serviceUrl = process.env.MESSAGE_SERVICE_URL ?? 'http://message_service:3000';

exports.handleUserDeleted = async (data) => {
  const senderId = data.user_id;

  if (!senderId) {
    console.log('❌ user_id manquant');
    return;
  }

  console.log(`🟢 Suppression des messages de l'utilisateur ${senderId}`);

  // await messageController.deleteMessagesBySenderIdRaw(senderId);
  await axios.delete(`${message_serviceUrl}/messages/sender/${senderId}`)
    .then((response) => {
      console.log(`✅ Messages supprimés pour l'utilisateur ${senderId}:`, response.data);
    })
    .catch((error) => {
      console.error(`❌ Erreur lors de la suppression des messages pour l'utilisateur ${senderId}:`, error.message);
    });
};

exports.handleUserCreated = async (data) => {
  const { user_id, name, email } = data;

  if (!user_id || !name || !email) {
    console.log('❌ Données utilisateur manquantes');
    return;
  }

  console.log(`🟢 Création de l'utilisateur ${user_id}`);

  try {
    const response = await axios.post(`${message_serviceUrl}/user`, {
      user_id,
      name,
      email
    });
    console.log(`✅ Utilisateur ${user_id} créé !`);
  } catch (error) {
    console.error(`❌ Erreur lors de la création de l'utilisateur ${user_id}:`, error.message);
  }
};

