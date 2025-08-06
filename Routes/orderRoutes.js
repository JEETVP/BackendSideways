const express = require('express');
const router = express.Router();
const orderController = require('../Controllers/OrderController'); 
const authenticate = require('../Middlewares/authMiddleware'); 

router.post('/create', authenticate, orderController.createOrder);

module.exports = router;

