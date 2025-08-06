const express = require('express');
const router = express.Router();
const addressController = require('../Controllers/addressController');
const authenticate = require('../Middlewares/authMiddleware');

// Agregar una nueva direcci�n
router.post('/add', authenticate, addressController.addAddress);

module.exports = router;
