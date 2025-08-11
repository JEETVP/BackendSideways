const Product = require('../Models/Product');
const validator = require('validator');

// Crear un nuevo producto (solo admin)
exports.createProduct = async (req, res) => {
    try {
        // 1) Solo admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Acceso denegado. Solo administradores pueden crear productos.' });
        }

        const { name, sizes, price, image, description, category } = req.body;

        // 2) Campos requeridos (permitimos category opcional)
        if (!name || !sizes || !price || !image || !description) {
            return res.status(400).json({ msg: 'Todos los campos son obligatorios.' });
        }

        // 3) Forzar numéricos aunque lleguen como string
        const parsedPrice = Number(price);
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            return res.status(400).json({ msg: 'Precio inválido.' });
        }

        if (!Array.isArray(sizes) || sizes.length === 0) {
            return res.status(400).json({ msg: 'Tallas inválidas. Deben venir en un arreglo.' });
        }
        const normalizedSizes = sizes.map(s => ({
            size: s?.size,
            stock: Number(s?.stock)
        }));
        if (!normalizedSizes.every(s => s.size && Number.isFinite(s.stock) && s.stock >= 0)) {
            return res.status(400).json({ msg: 'Tallas inválidas. Cada talla debe incluir "size" y "stock" numérico ≥ 0.' });
        }

        // 4) URL de imagen válida (requiere http/https)
        const isValidUrl = validator.isURL(String(image), {
            protocols: ['http', 'https'],
            require_protocol: true
        });
        if (!isValidUrl) {
            return res.status(400).json({ msg: 'URL de imagen no válida (usa http/https).' });
        }

        // 5) Evitar duplicados por nombre (case-insensitive)
        const existing = await Product.findOne({
            name: { $regex: `^${validator.escape(name.trim())}$`, $options: 'i' }
        });
        if (existing) {
            return res.status(409).json({ msg: 'Ya existe un producto con ese nombre.' });
        }

        // 6) Saneado básico
        const sanitizedName = validator.escape(name.trim());
        const sanitizedDescription = validator.escape(description.trim());

        // 7) Crear y guardar (el slug se autogenera en el modelo si seguiste mi schema)
        const newProduct = new Product({
            name: sanitizedName,
            sizes: normalizedSizes,
            price: parsedPrice,
            image: String(image).trim(),
            description: sanitizedDescription,
            category: category ? String(category).trim().toLowerCase() : undefined
        });

        await newProduct.save();
        return res.status(201).json({ msg: 'Producto creado exitosamente', product: newProduct });
    } catch (err) {
        console.error('Error al crear producto:', err);

        // Errores comunes: duplicado por índice único (p.ej. slug)
        if (err && err.code === 11000) {
            return res.status(409).json({ msg: 'Conflicto por duplicado (índice único). Revisa nombre/slug.' });
        }
        // Validación de Mongoose
        if (err?.name === 'ValidationError') {
            return res.status(400).json({ msg: 'Validación fallida', details: err.errors });
        }
        return res.status(500).json({ msg: 'Error en el servidor.' });
    }
};

// Obtener todos los productos (acceso público)
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        return res.status(200).json(products);
    } catch (err) {
        console.error('Error al obtener productos:', err);
        return res.status(500).json({ msg: 'Error en el servidor.' });
    }
};

// Obtener un producto por ID (acceso público)
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ msg: 'Producto no encontrado' });
        return res.status(200).json(product);
    } catch (err) {
        console.error('Error al buscar producto:', err);
        return res.status(500).json({ msg: 'Error en el servidor.' });
    }
};

