// Models/ShoppingCart.js
const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    size: {
        type: String,
        required: true,              // Debe existir en Product.sizes (valídalo en el controller)
        trim: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'La cantidad mínima es 1'],
        max: [50, 'Cantidad demasiado alta'],
    },
    // Opcional: snapshot de precio para UI (el total real se recalcula al checkout)
    addedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: true });

const CartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,                 // un carrito por usuario
        required: true,
        index: true,
    },
    items: [CartItemSchema],
}, {
    timestamps: true,
});

/**
 * Pre-validate:
 * - Normaliza talla (trim)
 * - Desduplica items por (product+size) sumando cantidades
 * - Elimina items con quantity <= 0
 */
CartSchema.pre('validate', function (next) {
    if (!Array.isArray(this.items)) return next();

    const map = new Map(); // key: `${productId}::${size}`
    for (const it of this.items) {
        if (!it || !it.product || !it.size) continue;
        const key = `${String(it.product)}::${String(it.size).trim()}`;
        const qty = Number(it.quantity) || 0;
        if (qty <= 0) continue;

        if (map.has(key)) {
            const curr = map.get(key);
            curr.quantity += qty;
            if (typeof it.priceSnapshot === 'number') curr.priceSnapshot = it.priceSnapshot;
            map.set(key, curr);
        } else {
            map.set(key, {
                product: it.product,
                size: String(it.size).trim(),
                quantity: qty,
                priceSnapshot: typeof it.priceSnapshot === 'number' ? it.priceSnapshot : null,
                addedAt: it.addedAt || new Date(),
            });
        }
    }

    this.items = Array.from(map.values());
    next();
});

/**
 * Helper estático: obtiene o crea el carrito del usuario.
 */
CartSchema.statics.getOrCreate = async function (userId) {
    let cart = await this.findOne({ user: userId });
    if (!cart) {
        cart = new this({ user: userId, items: [] });
        await cart.save();
    }
    return cart;
};

/**
 * Helper de instancia: upsert de un ítem
 * - Suma cantidad si ya existe el mismo (product+size)
 */
CartSchema.methods.upsertItem = function ({ productId, size, quantity, priceSnapshot = null }) {
    if (!productId || !size || !Number.isFinite(Number(quantity))) {
        throw new Error('Datos de item inválidos');
    }
    const keySize = String(size).trim();
    const idx = this.items.findIndex(
        it => String(it.product) === String(productId) && it.size === keySize
    );

    if (idx >= 0) {
        this.items[idx].quantity += Number(quantity);
        if (this.items[idx].quantity <= 0) this.items.splice(idx, 1);
        if (priceSnapshot !== null) this.items[idx].priceSnapshot = priceSnapshot;
    } else if (Number(quantity) > 0) {
        this.items.push({
            product: productId,
            size: keySize,
            quantity: Number(quantity),
            priceSnapshot,
        });
    }
    return this;
};

/**
 * Helper: setear cantidad exacta
 */
CartSchema.methods.setQuantity = function ({ productId, size, quantity }) {
    const keySize = String(size).trim();
    const item = this.items.find(
        it => String(it.product) === String(productId) && it.size === keySize
    );
    if (!item) return this;
    if (Number(quantity) <= 0) {
        this.items = this.items.filter(
            it => !(String(it.product) === String(productId) && it.size === keySize)
        );
    } else {
        item.quantity = Number(quantity);
    }
    return this;
};

/**
 * Helper: eliminar ítem
 */
CartSchema.methods.removeItem = function ({ productId, size }) {
    const keySize = String(size).trim();
    this.items = this.items.filter(
        it => !(String(it.product) === String(productId) && it.size === keySize)
    );
    return this;
};

/**
 * Helper: vaciar carrito
 */
CartSchema.methods.clear = function () {
    this.items = [];
    return this;
};

module.exports = mongoose.model('ShoppingCart', CartSchema);
