const express = require('express');
const router = express.Router();
const cardController = require('../Controllers/cardController');
const authenticate = require('../Middlewares/authMiddleware');

// Agregar una tarjeta
router.post('/add', authenticate, cardController.addCard);

// Eliminar una tarjeta por ID
router.delete('/delete/:id', authenticate, cardController.deleteCard);

// Obtener todas las tarjetas del usuario logeado
router.get('/my-cards', authMiddleware, cardController.getCards);

module.exports = router;
