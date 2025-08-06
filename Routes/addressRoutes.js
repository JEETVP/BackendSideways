const express = require('express');
const router = express.Router();
const addressController = require('../Controllers/addressController');
const authenticate = require('../Middlewares/authMiddleware');

// Agregar una nueva direcci�n
router.post('/add', authenticate, addressController.addAddress);

// Eliminar una direcci�n por ID
router.delete('/delete/:id', authenticate, addressController.deleteAddress);

// (Opcional) Obtener todas las direcciones del usuario
router.get('/my-addresses', authenticate, addressController.getUserAddresses);

module.exports = router;
