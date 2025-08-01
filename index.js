const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./Routes/authRoutes');

const app = express();

// Middlewares
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

// Ruta básica para ver si está vivo el servidor
app.get('/', (req, res) => {
    res.send('API de Sideways funcionando 👟🔥');
});

// Conexión a MongoDB y levantar servidor
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
