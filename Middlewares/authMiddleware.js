// Middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../Models/User'); // respeta mayúsculas
const SECRET = process.env.JWT_SECRET;

module.exports = async (req, res, next) => {
    try {
        const auth = req.headers.authorization || '';
        if (!auth.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, SECRET, { clockTolerance: 5 });

        const userId = decoded.id || decoded._id;
        if (!userId) return res.status(401).json({ message: 'Invalid token payload' });

        // Trae rol/flags actuales desde la BD
        const user = await User.findById(userId).select('email isAdmin role');
        if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });

        // Inyecta info consistente
        req.user = {
            ...decoded,
            id: String(userId),
            email: user.email,
            isAdmin: !!user.isAdmin,
            role: user.role || (user.isAdmin ? 'admin' : 'user'),
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(401).json({ message: 'Invalid token' });
    }
};


