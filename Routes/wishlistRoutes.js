// Routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();

const wishlistController = require('../Controllers/wishlistController');
const authenticate = require('../Middlewares/authMiddleware');

// Obtener wishlist (y limpiar inv�lidos)
router.get('/', authenticate, wishlistController.getWishlist);

// A�adir item a wishlist
router.post('/', authenticate, wishlistController.addItem);

// Eliminar item espec�fico de wishlist
router.delete('/', authenticate, wishlistController.removeItem);

// Vaciar wishlist completa
router.delete('/all', authenticate, wishlistController.clearWishlist);

// Mover item de wishlist -> carrito
router.post('/move-to-cart', authenticate, wishlistController.moveItemToCart);

module.exports = router;
