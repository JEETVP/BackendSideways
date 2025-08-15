// Routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();

const wishlistController = require('../Controllers/wishlistController');
const authenticate = require('../Middlewares/authMiddleware');

// Obtener wishlist (y limpiar inválidos)
router.get('/', authenticate, wishlistController.getWishlist);

// Añadir item a wishlist
router.post('/', authenticate, wishlistController.addItem);

// Eliminar item específico de wishlist
router.delete('/', authenticate, wishlistController.removeItem);

// Vaciar wishlist completa
router.delete('/all', authenticate, wishlistController.clearWishlist);

// Mover item de wishlist -> carrito
router.post('/move-to-cart', authenticate, wishlistController.moveItemToCart);

module.exports = router;
