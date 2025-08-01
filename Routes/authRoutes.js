const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');

// Registro con correo y contrase�a
router.post('/register', authController.register);

// Login con correo y contrase�a
router.post('/login', authController.login);

// Login con Google (endpoint base, a�n falta l�gica OAuth)
router.post('/google', authController.googleLogin);

// Verificaci�n de correo (pendiente de l�gica con token)
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
