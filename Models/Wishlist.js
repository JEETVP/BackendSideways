// Models/Wishlist.js
const mongoose = require('mongoose');

const normalizeSize = (s) => String(s ?? '').trim(); // talla opcional en wishlist

const WishlistItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    size: {
        type: String,
        default: null,            // En wishlist la talla puede ser opcional
        set: v => (v === null || v === undefined ? null : normalizeSize(v)),
    },
    note: {
        type: String,
        trim: true,
        maxlength: 200,
        default: '',
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: true });

const WishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,             // una wishlist por usuario
        required: true,
        index: true,
    },
    items: [WishlistItemSchema],
}, {
    timestamps: true,
});

/**
 * Pre-validate:
 * - Normaliza talla (trim o null)
 * - Desduplica items por (product+size) manteniendo el más reciente
 */
WishlistSchema.pre('validate', function (next) {
    if (!Array.isArray(this.items)) return next();

    const map = new Map(); // key: `${productId}::${size||''}`
    for (const it of this.items) {
        if (!it || !it.product) continue;

        const sizeKey = normalizeSize(it.size);
        const key = `${String(it.product)}::${sizeKey || ''}`;

        if (map.has(key)) {
            // Conservamos el "más nuevo": mayor addedAt o con nota más reciente
            const curr = map.get(key);
            const keep = (it.addedAt && curr.addedAt)
                ? (new Date(it.addedAt) > new Date(curr.addedAt))
                : true;
            map.set(key, keep ? { ...it.toObject(), size: sizeKey || null } : curr);
        } else {
            map.set(key, { ...it.toObject(), size: sizeKey || null });
        }
    }

    this.items = Array.from(map.values());
    next();
});

/**
 * Helper estático: obtiene o crea la wishlist del usuario.
 */
WishlistSchema.statics.getOrCreate = async function (userId) {
    let wl = await this.findOne({ user: userId });
    if (!wl) {
        wl = new this({ user: userId, items: [] });
        await wl.save();
    }
    return wl;
};

/**
 * Helper: upsert de un ítem
 * - Si ya existe (product+size), no duplica; opcionalmente actualiza nota.
 */
WishlistSchema.methods.upsertItem = function ({ productId, size = null, note = '' }) {
    if (!productId) throw new Error('productId requerido');

    const sizeKey = normalizeSize(size) || null;
    const idx = this.items.findIndex(
        it => String(it.product) === String(productId) && (it.size || null) === sizeKey
    );

    if (idx >= 0) {
        // Actualiza nota si viene algo (no machacar con string vacío)
        if (note && String(note).trim()) {
            this.items[idx].note = String(note).trim();
        }
        // Refresca timestamp para reflejar “actividad”
        this.items[idx].addedAt = new Date();
    } else {
        this.items.push({
            product: productId,
            size: sizeKey,
            note: String(note || '').trim(),
        });
    }
    return this;
};

/**
 * Helper: actualizar/definir nota
 */
WishlistSchema.methods.setNote = function ({ productId, size = null, note = '' }) {
    const sizeKey = normalizeSize(size) || null;
    const item = this.items.find(
        it => String(it.product) === String(productId) && (it.size || null) === sizeKey
    );
    if (item) item.note = String(note || '').trim();
    return this;
};

/**
 * Helper: eliminar un ítem (product + size)
 */
WishlistSchema.methods.removeItem = function ({ productId, size = null }) {
    const sizeKey = normalizeSize(size) || null;
    this.items = this.items.filter(
        it => !(String(it.product) === String(productId) && (it.size || null) === sizeKey)
    );
    return this;
};

/**
 * Helper: vaciar wishlist
 */
WishlistSchema.methods.clear = function () {
    this.items = [];
    return this;
};

module.exports = mongoose.model('Wishlist', WishlistSchema);
