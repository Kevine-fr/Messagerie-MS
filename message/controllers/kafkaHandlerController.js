const messageController = require('./messageController');
const userController = require('./userController');

const axios = require('axios');

const message_serviceUrl = process.env.MESSAGE_SERVICE_URL ?? 'http://message:3000';

exports.handleUserDeleted = async (data) => {
  const senderId = data.user_id;

  if (!senderId) {
    console.log('❌ user_id manquant');
    return;
  }

  console.log(`🟢 Suppression des messages et de l'utilisateur ${senderId}`);

  try {
    // Suppression des messages de l'utilisateur
    const msgRes = await axios.delete(`${message_serviceUrl}/messages/sender/${senderId}`);
    console.log(`✅ Messages supprimés pour l'utilisateur ${senderId}:`, msgRes.data);
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression des messages pour l'utilisateur ${senderId}:`, error.response?.data || error.message);
  }

  try {
    // Suppression de l'utilisateur dans le service user
    const userRes = await axios.delete(`${message_serviceUrl}/user/${senderId}`);
    console.log(`✅ Utilisateur ${senderId} supprimé !`, userRes.data);
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression de l'utilisateur ${senderId}:`, error.response?.data || error.message);
  }
};

exports.handleUserCreated = async (data) => {
  const { user_id, name, photo } = data;

  if (!user_id || !name) {
    console.log('❌ Données utilisateur manquantes');
    return;
  }

  console.log(`🟢 Création de l'utilisateur ${user_id}`);

  try {
    const response = await axios.post(`${message_serviceUrl}/user`, {
      user_id,
      name,
      photo
    });
    console.log(`✅ Utilisateur ${user_id} créé !`);
  } catch (error) {
    console.error(`❌ Erreur lors de la création de l'utilisateur ${user_id}:`, error.message);
  }
};

exports.handleUserUpdated = async (data) => {
  const { user_id, name, photo } = data;

  if (!user_id || !name) {
    console.log('❌ Données utilisateur manquantes');
    return;
  }

  console.log(`🟢 Modification de l'utilisateur ${user_id}`);

  try {
    await axios.put(`${message_serviceUrl}/user/${user_id}`, {
      name,
      photo,
    });

    console.log(`✅ Utilisateur ${user_id} modifié !`);
  } catch (error) {
    console.error(`❌ Erreur lors de la modification de l'utilisateur ${user_id}:`, error.message);
  }
};

