const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.post('/', messageController.createMessage);
router.get('/', messageController.getAllMessages);
router.delete('/', messageController.deleteAllMessages);
router.get('/sender/:senderId', messageController.getMessagesBySenderId);
router.delete('/sender/:senderId', messageController.deleteMessagesBySenderId);
router.get('/:id', messageController.getMessageById);
router.put('/:id', messageController.updateMessage);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;
