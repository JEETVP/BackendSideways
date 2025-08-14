// routes/shoppingcartRoutes.js
const express = require('express');
const router = express.Router();
const shoppingCartController = require('../Controllers/ShoppingCartController');
const { authMiddleware } = require('../Middlewares/authMiddleware');
// Cambia la ruta del middleware según donde lo tengas

// Consultar carrito (limpia items inválidos)
router.get('/', authMiddleware, shoppingCartController.getCart);

// Añadir item al carrito
router.post('/items', authMiddleware, shoppingCartController.addItem);

// Eliminar item específico
router.delete('/items', authMiddleware, shoppingCartController.removeItem);

// Vaciar carrito completo
router.delete('/', authMiddleware, shoppingCartController.clearCart);

// Preparar carrito para crear orden
router.post('/prepare-order', authMiddleware, shoppingCartController.prepareOrderFromCart);

module.exports = router;
