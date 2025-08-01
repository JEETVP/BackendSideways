const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');

// Registro con correo y contraseña
router.post('/register', authController.register);

// Login con correo y contraseña
router.post('/login', authController.login);

// Login con Google (endpoint base, aún falta lógica OAuth)
router.post('/google', authController.googleLogin);

// Verificación de correo (pendiente de lógica con token)
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
