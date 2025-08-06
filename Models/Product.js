const mongoose = require('mongoose');

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
        lowercase: true,
        trim: true
    },
    sizes: [
        {
            size: {
                type: String,
                required: true
            },
            stock: {
                type: Number,
                required: true,
                min: [0, 'El stock no puede ser negativo']
            }
        }
    ],
    price: {
        type: Number,
        required: true,
        min: [0, 'El precio debe ser mayor o igual a 0']
    },
    image: {
        type: String,
        required: true,
        validate: {
            validator: v => /^https?:\/\/.+/.test(v),
            message: 'La imagen debe ser una URL válida'
        }
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    category: {
        type: String,
        default: 'general',
        lowercase: true
    },
    brand: {
        type: String,
        default: 'sideways',
        trim: true
    },
    tags: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Eliminar campos no deseados en respuesta JSON
productSchema.methods.toJSON = function () {
    const product = this.toObject();
    delete product.__v;
    return product;
};

module.exports = mongoose.model('Product', productSchema);

