const express = require('express');
const router = express.Router();
const addressController = require('../Controllers/addressController');
const authenticate = require('../Middlewares/authMiddleware');

// Agregar una nueva dirección
router.post('/add', authenticate, addressController.addAddress);

// Eliminar una dirección por ID
router.delete('/delete/:id', authenticate, addressController.deleteAddress);

module.exports = router;
