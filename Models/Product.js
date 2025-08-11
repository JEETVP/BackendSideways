// models/Product.js
const mongoose = require('mongoose');
const { default: slugify } = require('slugify');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
        match: [/^[\w\sáéíóúÁÉÍÓÚñÑ\-:()]+$/, 'El nombre contiene caracteres inválidos']
    },
    slug: {
        type: String,
        unique: true,
        index: true,         // asegura índice
        lowercase: true,
        trim: true,
        required: true       // lo vamos a autollenar
    },
    sizes: [{
        size: { type: String, required: true },
        stock: { type: Number, required: true, min: [0, 'El stock no puede ser negativo'] }
    }],
    price: { type: Number, required: true, min: [0, 'El precio debe ser mayor o igual a 0'] },
    image: {
        type: String,
        required: true,
        validate: { validator: v => /^https?:\/\/.+/.test(v), message: 'La imagen debe ser una URL válida' }
    },
    description: { type: String, required: true, maxlength: 1000 },
    category: { type: String, default: 'general', lowercase: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Genera slug único a partir del name
productSchema.pre('validate', async function (next) {
    if (!this.isModified('name')) return next();

    const base = slugify(this.name, { lower: true, strict: true });
    if (!base) return next(new Error('No se pudo generar el slug'));

    // intenta base, si existe, agrega -2, -3, ...
    let candidate = base;
    let i = 1;
    while (await mongoose.model('Product').exists({ slug: candidate, _id: { $ne: this._id } })) {
        i += 1;
        candidate = `${base}-${i}`;
    }
    this.slug = candidate;
    next();
});

// Limpiar JSON
productSchema.methods.toJSON = function () {
    const product = this.toObject();
    delete product.__v;
    return product;
};

module.exports = mongoose.model('Product', productSchema);


