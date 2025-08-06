const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'El correo es obligatorio'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Correo inválido'],
        index: true
    },
    password: {
        type: String,
        minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
        select: false, // Para evitar que se devuelva en consultas
        validate: {
            validator: function (value) {
                if (!value) return true; // No validar si viene vacío (ej: Google Login)
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
            },
            message: 'La contraseña debe tener al menos 1 minúscula, 1 mayúscula, 1 número y mínimo 8 caracteres.'
        }
    },
    googleId: {
        type: String,
        default: null
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: {
        type: String
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    stripeCustomerId: {
        type: String,
        default: null
    },
    defaultAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        default: null
    },
    defaultCard: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        default: null
    }
}, {
    timestamps: true
});

// Para evitar enviar __v y otros campos sensibles en respuestas
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.__v;
    delete user.password;
    delete user.verificationToken;
    return user;
};

module.exports = mongoose.model('User', userSchema);



