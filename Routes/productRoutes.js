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

//Editar un producto (Solo Admin)
router.put('/:id', authenticate, productController.editProduct);

// Eliminar un producto (Solo Admin)
router.delete('/:id', authenticate, productController.deleteProduct);


module.exports = router;
