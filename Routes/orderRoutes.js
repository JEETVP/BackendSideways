const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/OrderController'); 
const authenticate = require('../Middlewares/authMiddleware'); 

router.post('/create', authenticate, orderController.createOrder);
router.patch('/:id/status', authenticate, /* requireAdmin, */ orderController.updateOrderStatus);

module.exports = router;

