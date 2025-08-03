const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../Controllers/authController');

// Registro y login por correo
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/verify-email/:token', authController.verifyEmail);

// ----------- GOOGLE AUTH RUTAS -----------

// Iniciar login con Google
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Callback desde Google (pruebas sin frontend)
router.get('/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/auth/google/failure', // solo para pruebas
        session: false
    }),
    authController.handleGoogleCallback
);

// Mensaje en caso de fallo
router.get('/google/failure', (req, res) => {
    res.status(401).json({ msg: 'Fallo en autenticación con Google' });
});

module.exports = router;
