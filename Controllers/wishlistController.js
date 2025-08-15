// Controllers/WishlistController.js
const Wishlist = require('../Models/Wishlist');
const ShoppingCart = require('../Models/ShoppingCart');
const Product = require('../Models/Product');

const normSize = (s) => String(s ?? '').trim();

/**
 * GET /api/wishlist
 * - Devuelve la wishlist del usuario
 * - Limpia items con producto inactivo/inexistente o talla con stock <= 0
 */
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        let wl = await Wishlist.getOrCreate(userId);
        if (!wl.items.length) return res.json(wl);

        const productIds = [...new Set(wl.items.map(it => String(it.product)))];
        const products = await Product.find({ _id: { $in: productIds } })
            .select('isActive sizes name image price slug')
            .lean();

        const byId = new Map(products.map(p => [String(p._id), p]));
        const kept = [];

        for (const it of wl.items) {
            const p = byId.get(String(it.product));
            if (!p || !p.isActive) continue;

            const sizeKey = it.size === null ? null : normSize(it.size);
            if (sizeKey === null) {
                // Si no guardaste talla en wishlist, lo mantenemos
                kept.push(it);
                continue;
            }

            const sizeInfo = p.sizes.find(s => s.size === sizeKey);
            if (!sizeInfo || sizeInfo.stock <= 0) continue;

            kept.push(it);
        }

        if (kept.length !== wl.items.length) {
            wl.items = kept;
            await wl.save();
        }

        // (Opcional) populate ligero
        // await wl.populate('items.product', 'name price image slug');

        return res.json(wl);
    } catch (err) {
        console.error('[WishlistController.getWishlist] error:', err);
        return res.status(500).json({ msg: 'Error al obtener la wishlist' });
    }
};

/**
 * POST /api/wishlist
 * Body: { productId, size?, note? }
 * - Upsert de item en wishlist (sin cantidades)
 * - Valida producto activo y talla (si viene)
 * - Si la talla viene y está sin stock => rechaza
 */
exports.addItem = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId } = req.body;
        let { size = null, note = '' } = req.body;

        if (!productId) return res.status(400).json({ msg: 'productId es requerido.' });

        const product = await Product.findById(productId).select('isActive sizes name').lean();
        if (!product || !product.isActive) {
            return res.status(404).json({ msg: 'Producto no disponible.' });
        }

        if (size !== null && size !== undefined && String(size).trim() !== '') {
            size = normSize(size);
            const sizeInfo = product.sizes.find(s => s.size === size);
            if (!sizeInfo) {
                return res.status(400).json({ msg: `Talla inválida para ${product.name}.` });
            }
            if (sizeInfo.stock <= 0) {
                return res.status(400).json({ msg: `La talla ${size} no tiene stock.` });
            }
        } else {
            size = null; // wishlist permite talla opcional
        }

        const wl = await Wishlist.getOrCreate(userId);
        wl.upsertItem({ productId, size, note: String(note || '').trim() });
        await wl.save();

        return res.status(201).json({ msg: 'Añadido a wishlist', wishlist: wl });
    } catch (err) {
        // índice único puede disparar 11000 si decidiste usar otro enfoque
        if (err?.code === 11000) {
            return res.status(200).json({ msg: 'Ya estaba en wishlist' });
        }
        console.error('[WishlistController.addItem] error:', err);
        return res.status(500).json({ msg: 'Error al añadir a wishlist' });
    }
};

/**
 * DELETE /api/wishlist
 * Body: { productId, size? }
 * - Elimina un ítem (product + size) de la wishlist
 */
exports.removeItem = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId } = req.body;
        let { size = null } = req.body;

        if (!productId) return res.status(400).json({ msg: 'productId es requerido.' });
        size = (size === null || size === undefined || String(size).trim() === '') ? null : normSize(size);

        const wl = await Wishlist.getOrCreate(userId);
        const before = wl.items.length;
        wl.removeItem({ productId, size });
        const after = wl.items.length;

        if (after === before) {
            return res.status(404).json({ msg: 'El item no estaba en la wishlist.' });
        }
        await wl.save();
        return res.json({ msg: 'Eliminado de wishlist', wishlist: wl });
    } catch (err) {
        console.error('[WishlistController.removeItem] error:', err);
        return res.status(500).json({ msg: 'Error al eliminar de wishlist' });
    }
};

/**
 * DELETE /api/wishlist/all
 * - Vacía toda la wishlist
 */
exports.clearWishlist = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const wl = await Wishlist.getOrCreate(userId);
        wl.clear();
        await wl.save();
        return res.json({ msg: 'Wishlist vaciada', wishlist: wl });
    } catch (err) {
        console.error('[WishlistController.clearWishlist] error:', err);
        return res.status(500).json({ msg: 'Error al vaciar wishlist' });
    }
};

/**
 * POST /api/wishlist/move-to-cart
 * Body: { productId, size?, quantity? }
 * - Mueve un item de wishlist al carrito:
 *   1) Valida producto activo y talla
 *   2) Valida stock y cantidad (default 1)
 *   3) Añade al carrito (upsert + cantidad)
 *   4) Elimina de wishlist ese (product+size)
 */
exports.moveItemToCart = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId } = req.body;
        let { size = null, quantity = 1 } = req.body;

        if (!productId) return res.status(400).json({ msg: 'productId es requerido.' });

        quantity = Number(quantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ msg: 'Cantidad inválida.' });
        }

        const product = await Product.findById(productId).select('isActive sizes name').lean();
        if (!product || !product.isActive) {
            return res.status(404).json({ msg: 'Producto no disponible.' });
        }

        // Si la wishlist no tenía talla guardada, la talla ES REQUERIDA aquí
        if (size === null || String(size).trim() === '') {
            return res.status(400).json({ msg: 'Debes especificar talla para añadir al carrito.' });
        }

        size = normSize(size);
        const sizeInfo = product.sizes.find(s => s.size === size);
        if (!sizeInfo) {
            return res.status(400).json({ msg: `Talla inválida para ${product.name}.` });
        }
        if (sizeInfo.stock <= 0) {
            // Limpia de wishlist por coherencia (sin stock)
            const wl0 = await Wishlist.getOrCreate(userId);
            wl0.removeItem({ productId, size });
            await wl0.save();
            return res.status(400).json({ msg: `La talla ${size} no tiene stock (se removió de wishlist).` });
        }

        // Límite amable en carrito
        const MAX_QTY = 10;
        if (quantity > MAX_QTY) quantity = MAX_QTY;
        if (quantity > sizeInfo.stock) {
            return res.status(400).json({ msg: `Stock insuficiente: máximo ${sizeInfo.stock} para talla ${size}.` });
        }

        // 1) Añadir al carrito (upsert + cantidad)
        const cart = await ShoppingCart.getOrCreate(userId);
        cart.upsertItem({ productId, size, quantity });
        await cart.save();

        // 2) Eliminar de wishlist
        const wl = await Wishlist.getOrCreate(userId);
        wl.removeItem({ productId, size });
        await wl.save();

        return res.status(200).json({ msg: 'Item movido a carrito y eliminado de wishlist', cart, wishlist: wl });
    } catch (err) {
        console.error('[WishlistController.moveItemToCart] error:', err);
        return res.status(500).json({ msg: 'Error al mover item de wishlist al carrito' });
    }
};
