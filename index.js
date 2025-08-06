require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session'); // si usarás sesiones (requerido por passport)
const cookieParser = require('cookie-parser');
require('./Config/googleStrategy'); // importa tu estrategia de Google


const authRoutes = require('./Routes/authRoutes');
const orderRoutes = require('./Routes/orderRoutes');


const app = express();
app.use(cookieParser());
app.use('/api/orders', orderRoutes);
// CORS solo permite los orígenes específicos
const allowedOrigins = ['https://sideways.com', 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Middleware para JSON
app.use(express.json());

// Session (necesaria para passport si no usas JWT directo en callback)
app.use(session({
    secret: process.env.SESSION_SECRET || 'sideways_secret',
    resave: false,
    saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de Sideways funcionando 👟🔥');
});

// Ruta para iniciar login con Google
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Ruta de callback después de login de Google
app.get('/api/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        session: false // si usas JWT, no quieres sesiones
    }),
    (req, res) => {
        // Aquí generas un token JWT y rediriges a tu frontend con el token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Redirige a tu frontend con el token en la URL (ajusta URL final real)
        res.redirect(`http://localhost:3000/login-success?token=${token}`);
    }
);

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('MongoDB connected');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });

