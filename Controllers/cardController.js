const Card = require('../Models/Card');
const validator = require('validator');

// Crear una tarjeta (agregar al perfil del usuario)
exports.addCard = async (req, res) => {
    try {
        const userId = req.user.id;
        const { cardNumber, expMonth, expYear, cvv, firstName, lastName } = req.body;

        // Validaciones
        if (!/^\d{16}$/.test(cardNumber)) {
            return res.status(400).json({ msg: 'Número de tarjeta inválido (deben ser 16 dígitos).' });
        }
        if (!/^\d{3}$/.test(cvv)) {
            return res.status(400).json({ msg: 'CVV inválido (deben ser 3 dígitos).' });
        }
        if (expMonth < 1 || expMonth > 12) {
            return res.status(400).json({ msg: 'Mes de expiración inválido.' });
        }

        const currentDate = new Date();
        const cardDate = new Date(`20${expYear}`, expMonth - 1);
        if (cardDate < currentDate) {
            return res.status(400).json({ msg: 'La tarjeta ya está vencida.' });
        }

        // Evitar tarjetas duplicadas del mismo usuario
        const exists = await Card.findOne({
            cardNumber,
            expMonth,
            expYear,
            user: userId
        });

        if (exists) {
            return res.status(409).json({ msg: 'Esta tarjeta ya está registrada.' });
        }

        const newCard = new Card({
            cardNumber,
            expMonth,
            expYear,
            cvv,
            firstName: validator.escape(firstName.trim()),
            lastName: validator.escape(lastName.trim()),
            user: userId
        });

        await newCard.save();
        res.status(201).json({ msg: 'Tarjeta agregada exitosamente', cardId: newCard._id });
    } catch (err) {
        console.error('Error al agregar tarjeta:', err);
        res.status(500).json({ msg: 'Error del servidor al agregar la tarjeta.' });
    }
};

// Eliminar tarjeta
exports.deleteCard = async (req, res) => {
    try {
        const userId = req.user.id;
        const cardId = req.params.id;

        const card = await Card.findById(cardId);

        if (!card) {
            return res.status(404).json({ msg: 'Tarjeta no encontrada' });
        }

        // Validación: Solo el dueño puede eliminar su tarjeta
        if (card.user && card.user.toString() !== userId) {
            return res.status(403).json({ msg: 'No autorizado para eliminar esta tarjeta' });
        }

        await Card.findByIdAndDelete(cardId);
        res.status(200).json({ msg: 'Tarjeta eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar tarjeta:', err);
        res.status(500).json({ msg: 'Error del servidor al eliminar la tarjeta.' });
    }
};
