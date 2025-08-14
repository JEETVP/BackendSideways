// routes/shoppingcartRoutes.js
const express = require('express');
const router = express.Router();

const shoppingCartController = require('../Controllers/ShoppingCartController');
const authenticate = require('../Middlewares/authMiddleware'); 

// Consultar carrito (limpia items inv�lidos)
router.get('/', authenticate, shoppingCartController.getCart);

// A�adir item al carrito
router.post('/items', authenticate, shoppingCartController.addItem);

// Eliminar item espec�fico
router.delete('/items', authenticate, shoppingCartController.removeItem);

// Vaciar carrito completo
router.delete('/', authenticate, shoppingCartController.clearCart);

// Preparar carrito para crear orden
router.post('/prepare-order', authenticate, shoppingCartController.prepareOrderFromCart);

module.exports = router; 
