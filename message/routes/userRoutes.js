const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/', userController.createUser);
router.get('/', userController.getAllUsers);
router.delete('/', userController.deleteAllUsers);

router.get('/:user_id', userController.getUserById);
router.put('/:user_id', userController.updateUserById);
router.delete('/:user_id', userController.deleteUserById);
router.get('/exclude/:user_id', userController.getAllExceptUser);
router.get('/conversation/:user_id' ,userController.allConversation);

module.exports = router;
