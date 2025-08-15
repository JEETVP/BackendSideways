require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('./Config/googleStrategy');
const authRoutes = require('./Routes/authRoutes');
const orderRoutes = require('./Routes/orderRoutes');
const productRoutes = require('./Routes/productRoutes');
const cardRoutes = require('./Routes/cardRoutes');
const addressRoutes = require('./Routes/addressRoutes');
const shoppingcartRoutes = require('./Routes/shoppingcartRoutes');
const wishlistRoutes = require('./Routes/wishlistRoutes');
const app = express();

// Middlewares base 
app.use(cookieParser());
app.use(express.json());

// CORS configurado 
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

//Passport Sessions (si usaras)
app.use(session({
    secret: process.env.SESSION_SECRET || 'sideways_secret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Rutas API 
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', shoppingcartRoutes);
app.use('/api/wishlist', wishlistRoutes);
// === Rutas públicas ===
app.get('/', (req, res) => {
    res.send('API de Sideways funcionando 👟🔥');
});

// === Google Auth ===
app.get('/api/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        session: false
    }),
    (req, res) => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.redirect(`http://localhost:3000/login-success?token=${token}`);
    }
);

// === Conexión a MongoDB ===
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => {
        console.log('✅ MongoDB connected');
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
    });


