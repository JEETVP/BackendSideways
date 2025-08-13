const mongoose = require('mongoose');
const RX_LETTERS = /^[\p{L}\s'-]+$/u;          // solo letras, espacios, ' y -
const RX_LETTERS_NUM_HYPH = /^[\p{L}\p{N}\s-]+$/u;      // letras, n�meros, espacios y -
const RX_STREET = /^[\p{L}\p{N}\s#\-.]+$/u;   // calle: letras, n�meros, espacio, #, -, .

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
        match: [/^[a-zA-Z������������\s]+$/, 'El nombre solo puede contener letras y espacios'],
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
        match: [/^\d+[A-Za-z]?$/u, 'El n�mero exterior debe ser num�rico (puede llevar letra)']
    },
    intNumber: {
        type: String,
        match: [/^\d+[A-Za-z]?$/u, 'El n�mero exterior debe ser num�rico (puede llevar letra)'],
        default: ''
    },
    phone: {
        type: String,
        required: true,
        match: [/^[2-9]\d{9}$/, 'N�mero de tel�fono inv�lido. Debe ser de 10 d�gitos y no comenzar con 0 o 1']
    },
    postalCode: {
        type: String,
        required: true,
        match: [/^\d{5}$/, 'El c�digo postal debe tener exactamente 5 d�gitos']
    },
    neighborhood: {
        type: String,
        required: true,
        trim: true,
        match: [RX_LETTERS_NUM_HYPH, 'Colonia inv�lida'],
        minlength: 2,
        maxlength: 100
    },
    municipality: {
        type: String,
        required: true,
        trim: true,
        match: [RX_LETTERS_NUM_HYPH, 'Municipio inv�lido'],
        minlength: 2,
        maxlength: 100
    },
    state: {
        type: String,
        required: true,
        trim: true,
        match: [RX_LETTERS_NUM_HYPH, 'Estado inv�lido'],
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

// �ndice compuesto para evitar direcciones duplicadas por usuario
addressSchema.index(
    { userId: 1, street: 1, extNumber: 1, intNumber: 1, postalCode: 1 },
    { unique: true, partialFilterExpression: { intNumber: { $exists: true } } }
);

module.exports = mongoose.model('Address', addressSchema);
