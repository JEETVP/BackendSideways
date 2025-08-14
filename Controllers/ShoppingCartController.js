// Controllers/ShoppingCartController.js
const Cart = require('../Models/ShoppingCart');
const Product = require('../Models/Product');

const normalizeSize = (s) => String(s || '').trim(); // si quieres forzar mayúsculas: .toUpperCase()

/**
 * GET /api/cart
 * Obtiene el carrito del usuario y limpia items inválidos (producto inactivo/inexistente o talla sin stock)
 */
exports.getCart = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        let cart = await Cart.getOrCreate(userId);

        if (!cart.items.length) return res.json(cart);

        const productIds = [...new Set(cart.items.map(it => String(it.product)))];
        const products = await Product.find({ _id: { $in: productIds } })
            .select('isActive sizes name image price')
            .lean();

        const byId = new Map(products.map(p => [String(p._id), p]));
        const kept = [];

        for (const it of cart.items) {
            const p = byId.get(String(it.product));
            if (!p || !p.isActive) continue;
            const sizeInfo = p.sizes.find(s => s.size === normalizeSize(it.size));
            if (!sizeInfo || sizeInfo.stock <= 0) continue;
            kept.push(it);
        }

        if (kept.length !== cart.items.length) {
            cart.items = kept;
            await cart.save();
        }

        // (opcional) populate ligero: await cart.populate('items.product', 'name price image slug');
        res.json(cart);
    } catch (err) {
        console.error('[ShoppingCartController.getCart] error:', err);
        res.status(500).json({ msg: 'Error al obtener el carrito' });
    }
};

/**
 * POST /api/cart/items
 * body: { productId, size, quantity }
 * Añade (o suma) un item al carrito con validaciones de producto/talla/stock.
 */
exports.addItem = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        let { productId, size, quantity } = req.body;

        size = normalizeSize(size);
        quantity = Number(quantity);

        if (!productId || !size || !Number.isFinite(quantity) || quantity <= 0) {
            return res.status(400).json({ msg: 'Datos de item inválidos.' });
        }

        const product = await Product.findById(productId).select('isActive sizes name').lean();
        if (!product || !product.isActive) {
            return res.status(404).json({ msg: 'Producto no disponible.' });
        }

        const sizeInfo = product.sizes.find(s => s.size === size);
        if (!sizeInfo) {
            return res.status(400).json({ msg: `Talla inválida para ${product.name}.` });
        }
        if (sizeInfo.stock <= 0) {
            return res.status(400).json({ msg: `La talla ${size} no tiene stock.` });
        }

        const MAX_QTY = 10;
        if (quantity > MAX_QTY) quantity = MAX_QTY;
        if (quantity > sizeInfo.stock) {
            return res.status(400).json({ msg: `Stock insuficiente: máximo ${sizeInfo.stock} para talla ${size}.` });
        }

        const cart = await Cart.getOrCreate(userId);
        cart.upsertItem({ productId, size, quantity });
        await cart.save();

        res.status(200).json({ msg: 'Item agregado al carrito', cart });
    } catch (err) {
        console.error('[ShoppingCartController.addItem] error:', err);
        res.status(500).json({ msg: 'Error al agregar item al carrito' });
    }
};

/**
 * DELETE /api/cart/items
 * body: { productId, size }
 * Quita un item (productId+size) del carrito.
 */
exports.removeItem = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { productId } = req.body;
        const size = normalizeSize(req.body.size);

        if (!productId || !size) return res.status(400).json({ msg: 'Faltan productId o size.' });

        const cart = await Cart.getOrCreate(userId);
        const before = cart.items.length;
        cart.removeItem({ productId, size });
        const after = cart.items.length;

        if (after === before) {
            return res.status(404).json({ msg: 'El item no estaba en el carrito.' });
        }
        await cart.save();
        res.json({ msg: 'Item eliminado', cart });
    } catch (err) {
        console.error('[ShoppingCartController.removeItem] error:', err);
        res.status(500).json({ msg: 'Error al eliminar item del carrito' });
    }
};

/**
 * DELETE /api/cart
 * Vacía el carrito completo.
 */
exports.clearCart = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const cart = await Cart.getOrCreate(userId);
        cart.clear();
        await cart.save();
        res.json({ msg: 'Carrito vaciado', cart });
    } catch (err) {
        console.error('[ShoppingCartController.clearCart] error:', err);
        res.status(500).json({ msg: 'Error al vaciar el carrito' });
    }
};

/**
 * POST /api/cart/prepare-order
 * Devuelve los items listos para crear la orden (compatible con tu createOrder):
 *   [{ productId, size, quantity }]
 * - Recorta cantidad si excede stock
 * - Elimina del carrito tallas sin stock o productos inválidos
 * - NO cobra ni crea la orden
 */
exports.prepareOrderFromCart = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const cart = await Cart.getOrCreate(userId);

        if (!cart.items.length) return res.status(400).json({ msg: 'El carrito está vacío.' });

        const productIds = [...new Set(cart.items.map(it => String(it.product)))];
        const products = await Product.find({ _id: { $in: productIds } })
            .select('isActive sizes name price')
            .lean();

        const byId = new Map(products.map(p => [String(p._id), p]));

        const productsPayload = []; // [{ productId, size, quantity }]
        const removed = [];
        const adjusted = [];

        for (const it of cart.items) {
            const p = byId.get(String(it.product));
            const sizeKey = normalizeSize(it.size);

            if (!p || !p.isActive) {
                removed.push({ reason: 'producto_invalido', item: it });
                continue;
            }
            const sizeInfo = p.sizes.find(s => s.size === sizeKey);
            if (!sizeInfo || sizeInfo.stock <= 0) {
                removed.push({ reason: 'sin_stock', item: it });
                continue;
            }

            let qty = Number(it.quantity);
            if (!Number.isFinite(qty) || qty <= 0) {
                removed.push({ reason: 'cantidad_no_valida', item: it });
                continue;
            }

            if (qty > sizeInfo.stock) {
                qty = sizeInfo.stock;
                adjusted.push({ product: it.product, size: sizeKey, newQty: qty });
            }

            productsPayload.push({
                productId: String(it.product),
                size: sizeKey,
                quantity: qty,
            });
        }

        // Refleja limpieza/ajustes en el carrito
        const keptKey = new Set(productsPayload.map(pp => `${pp.productId}::${pp.size}`));
        cart.items = cart.items
            .filter(it => keptKey.has(`${String(it.product)}::${normalizeSize(it.size)}`))
            .map(it => {
                const adj = adjusted.find(a => String(a.product) === String(it.product) && a.size === normalizeSize(it.size));
                if (adj) it.quantity = adj.newQty;
                return it;
            });

        await cart.save();

        if (!productsPayload.length) {
            return res.status(400).json({ msg: 'No hay items disponibles para ordenar (stock/producto inválidos).', removed });
        }

        return res.json({
            msg: 'Carrito listo para orden',
            products: productsPayload,
            notes: { removed, adjusted }
        });
    } catch (err) {
        console.error('[ShoppingCartController.prepareOrderFromCart] error:', err);
        res.status(500).json({ msg: 'Error al preparar el carrito para la orden' });
    }
};
