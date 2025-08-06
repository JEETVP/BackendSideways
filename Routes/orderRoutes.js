const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/OrderController'); 
const authenticate = require('../Middlewares/authMiddleware'); 

router.post('/create', authenticate, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderById);

module.exports = router;

