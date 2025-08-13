const Card = require('../Models/Card');
const validator = require('validator');

// Crear una tarjeta (agregar al perfil del usuario)
exports.addCard = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        let { cardNumber, expMonth, expYear, cvv, firstName, lastName } = req.body;

        // Normalización básica
        cardNumber = String(cardNumber || '').trim();
        cvv = String(cvv || '').trim();
        firstName = String(firstName || '').trim();
        lastName = String(lastName || '').trim();
        expMonth = Number(expMonth);
        expYear = Number(expYear); // esperado en 2 dígitos (ej. 28)

        // Validaciones
        if (!/^\d{16}$/.test(cardNumber)) {
            return res.status(400).json({ msg: 'Número de tarjeta inválido (deben ser 16 dígitos).' });
        }
        if (!/^\d{3}$/.test(cvv)) {
            return res.status(400).json({ msg: 'CVV inválido (deben ser 3 dígitos).' });
        }
        if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
            return res.status(400).json({ msg: 'Mes de expiración inválido.' });
        }
        if (!Number.isInteger(expYear) || expYear < 0 || expYear > 99) {
            return res.status(400).json({ msg: 'Año de expiración inválido (usa 2 dígitos, ej. 28 para 2028).' });
        }

        // Fecha no vencida
        const now = new Date();
        const fullYear = 2000 + expYear;             // 28 => 2028
        const cardDate = new Date(fullYear, expMonth - 1, 1);
        // Consideramos válida hasta el último día del mes
        const validUntil = new Date(fullYear, expMonth, 0, 23, 59, 59, 999);
        if (validUntil < now) {
            return res.status(400).json({ msg: 'La tarjeta ya está vencida.' });
        }

        // Nombres (permitimos letras/espacios con acentos)
        const RX_LETTERS = /^[\p{L}\s'-]+$/u;
        if (!RX_LETTERS.test(firstName) || !RX_LETTERS.test(lastName)) {
            return res.status(400).json({ msg: 'Nombre y apellido solo pueden contener letras y espacios.' });
        }

        // Evitar tarjetas duplicadas del mismo usuario
        const exists = await Card.findOne({
            userId,
            cardNumber,
            expMonth,
            expYear
        }).lean();

        if (exists) {
            return res.status(409).json({ msg: 'Esta tarjeta ya está registrada.' });
        }

        // Guardar (no usamos escape para no transformar texto)
        const newCard = new Card({
            userId,          // <-- clave: guardar al dueño
            cardNumber,
            expMonth,
            expYear,
            cvv,
            firstName,
            lastName
        });

        await newCard.save();
        // Por seguridad, no devolvemos cardNumber/cvv (además cardNumber tiene select:false)
        return res.status(201).json({
            msg: 'Tarjeta agregada exitosamente',
            card: {
                _id: newCard._id,
                firstName: newCard.firstName,
                lastName: newCard.lastName,
                expMonth: newCard.expMonth,
                expYear: newCard.expYear
            }
        });
    } catch (err) {
        console.error('Error al agregar tarjeta:', err);
        return res.status(500).json({ msg: 'Error del servidor al agregar la tarjeta.' });
    }
};

// Eliminar tarjeta
exports.deleteCard = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { id: cardId } = req.params;

        const card = await Card.findById(cardId).select('userId');
        if (!card) {
            return res.status(404).json({ msg: 'Tarjeta no encontrada' });
        }

        if (String(card.userId) !== String(userId)) {
            return res.status(403).json({ msg: 'No autorizado para eliminar esta tarjeta' });
        }

        await Card.findByIdAndDelete(cardId);
        return res.status(200).json({ msg: 'Tarjeta eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar tarjeta:', err);
        return res.status(500).json({ msg: 'Error del servidor al eliminar la tarjeta.' });
    }
};

