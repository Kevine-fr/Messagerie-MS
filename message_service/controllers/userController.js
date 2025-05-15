const User = require('../models/User');

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



