// controllers/productController.js
const Product = require('../Models/Product');
const validator = require('validator');

// Crear un nuevo producto (solo admin)
exports.createProduct = async (req, res) => {
    try {
        // Validación 1: Solo admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acceso denegado. Solo administradores pueden crear productos.' });
        }

        const { name, sizes, price, image, description, category } = req.body;

        // Validación 2: Campos requeridos y formato correcto
        if (!name || !sizes || !price || !image || !description) {
            return res.status(400).json({ msg: 'Todos los campos son obligatorios.' });
        }

        if (!Array.isArray(sizes) || sizes.length === 0 || !sizes.every(s => s.size && typeof s.stock === 'number' && s.stock >= 0)) {
            return res.status(400).json({ msg: 'Tallas inválidas. Deben incluir size y stock numérico válido.' });
        }

        if (typeof price !== 'number' || price <= 0) {
            return res.status(400).json({ msg: 'Precio inválido.' });
        }

        if (!validator.isURL(image, { require_protocol: true })) {
            return res.status(400).json({ msg: 'URL de imagen no válida.' });
        }

        // Validación 3: No permitir productos duplicados
        const existing = await Product.findOne({ name: name.trim() });
        if (existing) {
            return res.status(409).json({ msg: 'Ya existe un producto con ese nombre.' });
        }

        // Validación 4: Saneado básico (puedes mejorarlo con dompurify si es necesario)
        const sanitizedDescription = validator.escape(description);
        const sanitizedName = validator.escape(name);

        const newProduct = new Product({
            name: sanitizedName,
            sizes,
            price,
            image,
            description: sanitizedDescription,
            category
        });

        await newProduct.save();
        res.status(201).json({ msg: 'Producto creado exitosamente', product: newProduct });
    } catch (err) {
        console.error('Error al crear producto:', err);
        res.status(500).json({ msg: 'Error en el servidor.' });
    }
};

// Obtener todos los productos
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        res.status(500).json({ msg: 'Error en el servidor.' });
    }
};

// Obtener un producto por ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ msg: 'Producto no encontrado' });
        }
        res.status(200).json(product);
    } catch (err) {
        console.error('Error al buscar producto:', err);
        res.status(500).json({ msg: 'Error en el servidor.' });
    }
};
