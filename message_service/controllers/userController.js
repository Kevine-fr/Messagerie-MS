const User = require('../models/User');
const Message = require('../models/Message');

// ➕ Créer un user
exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.user });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const user = await User.find();
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.user });
  }
};

exports.deleteAllUsers = async (req, res) => {
  try {
    const result = await User.deleteMany({});
    res.status(200).json({
      message: `${result.deletedCount} utilisateur(s) supprimé(s).`
    });
  } catch (err) {
    console.error('Erreur lors de la suppression des utilisateurs :', err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression des utilisateurs.' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findOne({ user_id: req.params.user_id });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const mongoose = require('mongoose'); // si tu veux vérifier l'ObjectId

exports.updateUserById = async (req, res) => {
  const { name, photo } = req.body;
  const { user_id } = req.params;

  if (!user_id || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: "Champs requis manquants ou invalides" });
  }

  try {
    const existingUser = await User.findOne({ user_id: Number(user_id) });

    if (!existingUser) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const updateResult = await User.updateOne({ user_id: Number(user_id) }, { name, photo });

    if (updateResult.modifiedCount === 0) {
      return res.status(200).json({ message: "Aucune modification effectuée", update: updateResult });
    }

    return res.json({ message: "Utilisateur mis à jour", update: updateResult });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteUserById = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ user_id: req.params.user_id });
    if (!deletedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllExceptUser = async (req, res) => {
  try {
    const excludedUserId = parseInt(req.params.user_id);

    const users = await User.find({ user_id: { $ne: excludedUserId } });

    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.allConversation = async (req, res) => {
  try {
    const currentUserId = parseInt(req.params.user_id);

    // 1. Récupérer tous les utilisateurs sauf l'utilisateur actuel
    const users = await User.find({ user_id: { $ne: currentUserId } });

    const conversations = await Promise.all(users.map(async (user) => {
      const otherUserId = user.user_id;

      // 2. Dernier message échangé
      const lastMessage = await Message.findOne({
        $or: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId },
        ]
      }).sort({ createdAt: -1 });

      // 3. Nombre de messages non lus venant de ce user vers l'utilisateur connecté
      const unreadCount = await Message.countDocuments({
        senderId: otherUserId,
        receiverId: currentUserId,
        isRead: false
      });

      return {
        user,
        lastMessage,
        unreadCount
      };
    }));

    // 4. Trier les conversations par date de création du dernier message (createdAt), décroissante
    conversations.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
      const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
      return dateB - dateA;
    });

    res.status(200).json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
