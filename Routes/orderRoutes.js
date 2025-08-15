const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/OrderController'); 
const authenticate = require('../Middlewares/authMiddleware'); 

router.post('/add', authenticate, orderController.createOrder);
router.patch('/:id/status', authenticate, /* requireAdmin, */ orderController.updateOrderStatus);
// Obtener todas las órdenes (solo admin)
router.get('/all', authenticate, orderController.getAllOrders);

// Actualizar estado de una orden (eliminar si es "Entregado")
router.put('/:id/status', authenticate, orderController.deleteOrderStatus);


module.exports = router;

