const mongoose = require('mongoose');
const RX_LETTERS = /^[\p{L}\s'-]+$/u;          // solo letras, espacios, ' y -
const RX_LETTERS_NUM_HYPH = /^[\p{L}\p{N}\s-]+$/u;      // letras, n�meros, espacios y -
const RX_STREET = /^[\p{L}\p{N}\s#\-.]+$/u;   // calle: letras, n�meros, espacio, #, -, .

const cardSchema = new mongoose.Schema({
    cardNumber: {
        select: false,
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{16}$/.test(v); // 16 d�gitos num�ricos
            },
            message: props => `${props.value} no es un n�mero de tarjeta v�lido.`
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
                const currentYear = new Date().getFullYear() % 100; // �ltimo par de d�gitos
                return year >= currentYear;
            },
            message: props => `El a�o de expiraci�n ${props.value} ya pas�.`
        }
    },
    cvv: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^\d{3}$/.test(v); // solo 3 d�gitos
            },
            message: props => `${props.value} no es un CVV v�lido.`
        }
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
        match: [RX_LETTERS_NUM_HYPH, 'Nombre inv�lido'],
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        match: [RX_LETTERS_NUM_HYPH, 'Apellido inv�lido'],
    }
});

// Validaci�n combinada de fecha de expiraci�n
cardSchema.pre('save', function (next) {
    const { expMonth, expYear } = this;
    const now = new Date();
    const cardDate = new Date(`20${expYear}`, expMonth - 1); // asumimos 2 d�gitos (ej: 25 = 2025)
    if (cardDate < now) {
        return next(new Error('La tarjeta ya est� vencida.'));
    }
    next();
});

module.exports = mongoose.model('Card', cardSchema);
