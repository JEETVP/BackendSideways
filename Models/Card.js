const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    cardNumber: {
        select: false,
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{16}$/.test(v); // 16 dígitos numéricos
            },
            message: props => `${props.value} no es un número de tarjeta válido.`
        }
    },
    expMonth: {
        type: Number,
        required: true,
        min: 1,
        max: 12
    },
    expYear: {
        type: Number,
        required: true,
        validate: {
            validator: function (year) {
                const currentYear = new Date().getFullYear() % 100; // último par de dígitos
                return year >= currentYear;
            },
            message: props => `El año de expiración ${props.value} ya pasó.`
        }
    },
    cvv: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{3}$/.test(v); // solo 3 dígitos
            },
            message: props => `${props.value} no es un CVV válido.`
        }
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        match: [/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras']
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        match: [/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El apellido solo puede contener letras']
    }
});

// Validación combinada de fecha de expiración
cardSchema.pre('save', function (next) {
    const { expMonth, expYear } = this;
    const now = new Date();
    const cardDate = new Date(`20${expYear}`, expMonth - 1); // asumimos 2 dígitos (ej: 25 = 2025)
    if (cardDate < now) {
        return next(new Error('La tarjeta ya está vencida.'));
    }
    next();
});

module.exports = mongoose.model('Card', cardSchema);
