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

exports.updateUserById = async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { user_id: req.params.user_id },
      req.body,
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
      }).sort({ timestamp: -1 }); // dernier message

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

    res.status(200).json(conversations);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



