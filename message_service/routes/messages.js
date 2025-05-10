const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// ➕ Créer un message
router.post('/', async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 📥 Récupérer tous les messages
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 Récupérer un message par ID
router.get('/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📝 Mettre à jour un message
router.put('/:id', async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });
    res.json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ❌ Supprimer un message
router.delete('/:id', async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ error: 'Message non trouvé' });
    res.json({ message: 'Message supprimé' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sender/:senderId', async (req, res) => {
  try {
    // Convertir senderId en entier
    const senderId = parseInt(req.params.senderId);

    // Vérifier que l'ID est valide
    if (isNaN(senderId)) {
      return res.status(400).json({ message: 'Le senderId doit être un entier.' });
    }

    // Récupérer les messages en fonction du senderId
    const messages = await Message.find({ senderId: senderId });

    // Si aucun message n'est trouvé
    if (messages.length === 0) {
      return res.status(404).json({ message: 'Aucun message trouvé pour cet senderId.' });
    }

    // Retourner les messages trouvés
    res.status(200).json(messages);
  } catch (err) {
    // Gérer les erreurs
    console.error(err);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

router.delete('/sender/:senderId', async (req, res) => {
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
});

module.exports = router;
