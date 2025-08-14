// routes/shoppingcartRoutes.js
const express = require('express');
const router = express.Router();
const shoppingCartController = require('../Controllers/ShoppingCartController');
const { authMiddleware } = require('../Middlewares/authMiddleware');
// Cambia la ruta del middleware seg�n donde lo tengas

// Consultar carrito (limpia items inv�lidos)
router.get('/', authMiddleware, shoppingCartController.getCart);

// A�adir item al carrito
router.post('/items', authMiddleware, shoppingCartController.addItem);

// Eliminar item espec�fico
router.delete('/items', authMiddleware, shoppingCartController.removeItem);

// Vaciar carrito completo
router.delete('/', authMiddleware, shoppingCartController.clearCart);

// Preparar carrito para crear orden
router.post('/prepare-order', authMiddleware, shoppingCartController.prepareOrderFromCart);

module.exports = router;
