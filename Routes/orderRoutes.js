const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/orderController');
const authenticate = require('../Middlewares/authMiddleware'); // Middleware para verificar JWT

// Crear una orden y procesar el pago
router.post('/create', authenticate, orderController.createOrder);

// Obtener todas las �rdenes del usuario autenticado (opcional, �til para el historial)
router.get('/my-orders', authenticate, orderController.getUserOrders);

// Obtener detalle de una orden espec�fica por ID (opcional)
router.get('/:id', authenticate, orderController.getOrderById);

module.exports = router;
