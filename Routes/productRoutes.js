const express = require('express');
const router = express.Router();
const productController = require('../Controllers/productController');
const authenticate = require('../Middlewares/authMiddleware');

// Crear un nuevo producto
router.post('/add', authenticate, productController.createProduct);

// Obtener todos los productos (público o autenticado)
router.get('/', productController.getAllProducts);

// Obtener un producto por ID
router.get('/:id', productController.getProductById);

// (Opcional) Eliminar un producto por ID (si quieres gestión de inventario desde backend)
router.delete('/delete/:id', authenticate, productController.deleteProduct);

module.exports = router;
