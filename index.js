const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const authRoutes = require('./Routes/authRoutes');

const app = express();

// ✅ Configura CORS solo para tu frontend (ajusta la URL final de tu frontend)
app.use(cors({
    origin: 'https://sideways.vercel.app', // ⬅️ cámbiala por la tuya
    credentials: true
}));

// Middleware para recibir JSON
app.use(express.json());

// ✅ Rutas de autenticación
app.use('/api/auth', authRoutes);

// Ruta base para comprobar funcionamiento
app.get('/', (req, res) => {
    res.send('API de Sideways funcionando 👟🔥');
});

// ✅ Conexión a MongoDB y arranque del servidor
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
