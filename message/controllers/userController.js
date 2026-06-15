const User = require('../models/User');
const Message = require('../models/Message');
const DeviceToken = require('../models/DeviceToken');

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

// ➕ Enregistre / met à jour un token FCM (upsert par token).
exports.registerFcmToken = async (req, res) => {
  try {
    const { userId, token, platform } = req.body;
    if (!userId || !token) {
      return res.status(400).json({ error: 'userId et token requis.' });
    }
    await DeviceToken.findOneAndUpdate(
      { token },
      { userId: Number(userId), token, platform: platform || 'unknown' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: 'Token enregistré.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🗑️ Supprime un token FCM (déconnexion).
exports.removeFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token requis.' });
    await DeviceToken.deleteOne({ token });
    res.status(200).json({ message: 'Token supprimé.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    // 1. Agrégation : pour CHAQUE correspondant, le dernier message + le nombre
    //    de non-lus — en une seule requête (au lieu de 2 par utilisateur).
    const stats = await Message.aggregate([
      { $match: { $or: [{ senderId: currentUserId }, { receiverId: currentUserId }] } },
      {
        $addFields: {
          partnerId: {
            $cond: [{ $eq: ['$senderId', currentUserId] }, '$receiverId', '$senderId'],
          },
        },
      },
      // Le plus récent en premier pour que $first = dernier message.
      { $sort: { _id: -1 } },
      {
        $group: {
          _id: '$partnerId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiverId', currentUserId] },
                  { $eq: ['$isRead', false] },
                ] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const statsByPartner = new Map(stats.map((s) => [s._id, s]));

    // 2. Tous les utilisateurs sauf l'utilisateur courant (une seule requête).
    const users = await User.find({ user_id: { $ne: currentUserId } });

    const conversations = users.map((user) => {
      const s = statsByPartner.get(user.user_id);
      return {
        user,
        lastMessage: s ? s.lastMessage : null,
        unreadCount: s ? s.unreadCount : 0,
      };
    });

    // 3. Tri par date du dernier message (décroissante), sans message en dernier.
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
