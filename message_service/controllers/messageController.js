const User = require('../models/User');
const Message = require('../models/Message');
const { sendToKafka } = require('../services/kafkaProducer');
const socket = require('../config/socket'); 

exports.createMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;

    // Vérifie si l'expéditeur existe
    const sender = await User.findOne({ user_id: senderId });
    if (!sender) {
      return res.status(404).json({ error: "Expéditeur introuvable dans le cache." });
    }

    // Vérifie si le destinataire existe
    const receiver = await User.findOne({ user_id: receiverId });
    if (!receiver) {
      return res.status(404).json({ error: "Destinataire introuvable dans le cache." });
    }

    if (senderId === receiverId){
      return res.status(409).json({error : "Vous ne pouvez pas vous envoyez un message à vous même !"})
    }

    const message = new Message({
      senderId,
      receiverId,
      content,
    });
    await message.save();

    // Récupérer l'instance io depuis le module socket.js
    const io = socket.getIO();
    const receiverSocketId = socket.getUserSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("new_message", {
        from: senderId,
        to: receiverId,
        content,
      });
    }

    // Envoie le topic 'message.created' vers le Message Brocker 'Kafka'
    await sendToKafka('message.created', {
      content: message.content,
      user_id: senderId,
      receiver_id: receiverId,
    });

    res.status(201).json([message]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// 📥 Récupérer tous les messages
exports.getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📥 Récupérer un message par ID
exports.getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📝 Mettre à jour un message
exports.updateMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });

    const io = socket.getIO();
    const receiverSocketId = socket.getUserSocketId(message.receiverId);
    const senderSocketId = socket.getUserSocketId(message.senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message_updated", message);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("message_updated", message);
    }

    res.json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });

    const io = socket.getIO();
    const receiverSocketId = socket.getUserSocketId(message.receiverId);
    const senderSocketId = socket.getUserSocketId(message.senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message_deleted", { messageId: req.params.id });
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("message_deleted", { messageId: req.params.id });
    }

    res.json({ message: 'Message supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📥 Messages par senderId
exports.getMessagesBySenderId = async (req, res) => {
  try {
    const senderId = parseInt(req.params.senderId);
    if (isNaN(senderId)) {
      return res.status(400).json({ message: 'Le senderId doit être un entier.' });
    }

    const messages = await Message.find({ senderId });
    if (messages.length === 0) {
      return res.status(404).json({ message: 'Aucun message trouvé pour cet senderId.' });
    }

    res.status(200).json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// ❌ Supprimer les messages par senderId
exports.deleteMessagesBySenderId = async (req, res) => {
  try {
    // Convertir senderId en entier
    const senderId = parseInt(req.params.senderId);

    // Vérifier que l'ID est valide
    if (isNaN(senderId)) {
      return res.status(400).json({ message: 'Le senderId doit être un entier.' });
    }

    // Supprimer tous les messages du senderId
    const result = await Message.deleteMany({ senderId: senderId });

    // Si aucun message n'est supprimé
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Aucun message trouvé pour cet senderId à supprimer.' });
    }

    // Retourner le nombre de messages supprimés
    res.status(200).json({ message: `${result.deletedCount} message(s) supprimé(s).` });
  } catch (err) {
    // Gérer les erreurs
    console.error(err);
    res.status(500).json({ error: 'Une erreur est survenue lors de la suppression des messages.' });
  }
}

exports.deleteAllMessages = async (req, res) => {
  try {
    const result = await Message.deleteMany({});
    res.status(200).json({ message: `${result.deletedCount} message(s) supprimé(s).` });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression de tous les messages.' });
  }
};

// Nouvelle fonction utilisable par Kafka

exports.deleteMessagesBySenderIdRaw = async (senderId) => {
  try {
    // Vérifie l'ID
    if (typeof senderId !== 'number' || isNaN(senderId)) {
      console.error('❌ Le senderId doit être un entier valide.');
      return;
    }

    console.log(`🗑️ Suppression des messages pour le senderId ${senderId}...`);

    const result = await Message.deleteMany({ senderId: senderId });

    if (result.deletedCount === 0) {
      console.warn(`⚠️ Aucun message trouvé pour le senderId ${senderId} à supprimer.`);
    } else {
      console.log(`✅ ${result.deletedCount} message(s) supprimé(s) pour le senderId ${senderId}.`);
    }
  } catch (err) {
    console.error(`❌ Erreur lors de la suppression des messages : ${err.message}`);
  }
};

// 🔍 Récupérer le dernier message entre deux utilisateurs
exports.getLastMessageBetweenUsers = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const message = await Message.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: -1 }); // le plus récent en premier

    if (!message) {
      return res.status(404).json({ message: "Aucun message trouvé entre ces utilisateurs." });
    }

    res.status(200).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 📜 Récupérer tous les messages entre deux utilisateurs
exports.getAllMessagesBetweenUsers = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 }); // du plus ancien au plus récent

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.countUnreadMessagesBetweenUsers = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const count = await Message.countDocuments({
      senderId,
      receiverId,
      isRead: false
    });

    res.status(200).json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    const result = await Message.updateMany(
      {
        senderId,
        receiverId,
        isRead: false
      },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: `${result.modifiedCount} messages marqués comme lus.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




