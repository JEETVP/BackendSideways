const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        match: [/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios'],
        minlength: 2,
        maxlength: 50
    },
    street: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 100
    },
    extNumber: {
        type: String,
        required: true,
        match: [/^\d+$/, 'El número exterior debe ser numérico']
    },
    intNumber: {
        type: String,
        match: [/^\d*$/, 'El número interior debe ser numérico'],
        default: ''
    },
    phone: {
        type: String,
        required: true,
        match: [/^[2-9]\d{9}$/, 'Número de teléfono inválido. Debe ser de 10 dígitos y no comenzar con 0 o 1']
    },
    postalCode: {
        type: String,
        required: true,
        match: [/^\d{5}$/, 'El código postal debe tener exactamente 5 dígitos']
    },
    neighborhood: {
        type: String,
        required: true,
        trim: true,
        match: [/^[\w\sáéíóúÁÉÍÓÚñÑ\-]+$/, 'Colonia inválida'],
        minlength: 2,
        maxlength: 100
    },
    municipality: {
        type: String,
        required: true,
        trim: true,
        match: [/^[\w\sáéíóúÁÉÍÓÚñÑ\-]+$/, 'Municipio inválido'],
        minlength: 2,
        maxlength: 100
    },
    state: {
        type: String,
        required: true,
        trim: true,
        match: [/^[\w\sáéíóúÁÉÍÓÚñÑ\-]+$/, 'Estado inválido'],
        minlength: 2,
        maxlength: 100
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Índice compuesto para evitar direcciones duplicadas por usuario
addressSchema.index(
    { userId: 1, street: 1, extNumber: 1, intNumber: 1, postalCode: 1 },
    { unique: true, partialFilterExpression: { intNumber: { $exists: true } } }
);

module.exports = mongoose.model('Address', addressSchema);
