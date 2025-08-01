const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'El correo es obligatorio'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Correo inv�lido']
    },
    password: {
        type: String,
        minlength: [8, 'La contrase�a debe tener al menos 8 caracteres'],
        validate: {
            validator: function (value) {
                // Solo validar si el campo est� presente (no es login con Google)
                if (!value) return true;
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
            },
            message: 'La contrase�a debe tener al menos 1 min�scula, 1 may�scula, 1 n�mero y m�nimo 8 caracteres.'
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);


