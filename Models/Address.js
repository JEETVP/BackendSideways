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
        match: [/^\d+$/, 'El n�mero exterior debe ser num�rico']
    },
    intNumber: {
        type: String,
        match: [/^\d*$/, 'El n�mero interior debe ser num�rico'],
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
        match: [/^[\w\s������������\-]+$/, 'Colonia inv�lida'],
        minlength: 2,
        maxlength: 100
    },
    municipality: {
        type: String,
        required: true,
        trim: true,
        match: [/^[\w\s������������\-]+$/, 'Municipio inv�lido'],
        minlength: 2,
        maxlength: 100
    },
    state: {
        type: String,
        required: true,
        trim: true,
        match: [/^[\w\s������������\-]+$/, 'Estado inv�lido'],
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
