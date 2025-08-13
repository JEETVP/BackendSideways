
const Address = require('../Models/Address');
const validator = require('validator');

exports.addAddress = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id; // <-- Asegurar que lo obtenemos

        let {
            name, street, extNumber, intNumber,
            phone, postalCode, neighborhood, municipality, state
        } = req.body;

        // Validaciones b�sicas
        if (
            !name || !street || !extNumber || !phone || !postalCode ||
            !neighborhood || !municipality || !state
        ) {
            return res.status(400).json({ msg: 'Todos los campos obligatorios deben ser completados.' });
        }

        // Validaciones espec�ficas
        if (!/^[a-zA-Z������������\s]{2,50}$/.test(name)) {
            return res.status(400).json({ msg: 'El nombre solo puede contener letras y espacios (2-50 caracteres).' });
        }

        if (!/^[0-9]{5}$/.test(postalCode)) {
            return res.status(400).json({ msg: 'El c�digo postal debe tener 5 d�gitos.' });
        }

        if (!/^[2-9]\d{9}$/.test(phone)) {
            return res.status(400).json({ msg: 'El n�mero de tel�fono debe tener 10 d�gitos v�lidos (sin iniciar con 0 o 1).' });
        }

        if (!/^\d+$/.test(extNumber)) {
            return res.status(400).json({ msg: 'El n�mero exterior debe ser num�rico.' });
        }

        if (intNumber && !/^\d+$/.test(intNumber)) {
            return res.status(400).json({ msg: 'El n�mero interior debe ser num�rico si se proporciona.' });
        }

        // Sanitizar strings
        name = validator.escape(name.trim());
        street = validator.escape(street.trim());
        neighborhood = validator.escape(neighborhood.trim());
        municipality = validator.escape(municipality.trim());
        state = validator.escape(state.trim());

        // Evitar duplicados
        const duplicate = await Address.findOne({
            userId,
            street,
            extNumber,
            intNumber,
            postalCode
        });

        if (duplicate) {
            return res.status(409).json({ msg: 'Ya tienes registrada esta direcci�n.' });
        }

        const newAddress = new Address({
            userId, // <-- Aqu� se guarda el ID del usuario
            name,
            street,
            extNumber,
            intNumber: intNumber || '',
            phone,
            postalCode,
            neighborhood,
            municipality,
            state
        });

        const savedAddress = await newAddress.save();
        res.status(201).json({ msg: 'Direcci�n a�adida correctamente', address: savedAddress });
    } catch (err) {
        console.error('Error al a�adir direcci�n:', err);
        res.status(500).json({ msg: 'Error del servidor al a�adir direcci�n' });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const addressId = req.params.id;

        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).json({ msg: 'Direcci�n no encontrada.' });
        }

        if (String(address.userId) !== String(userId)) {
            return res.status(403).json({ msg: 'No est�s autorizado para eliminar esta direcci�n.' });
        }

        await Address.findByIdAndDelete(addressId);

        res.status(200).json({ msg: 'Direcci�n eliminada correctamente.' });
    } catch (err) {
        console.error('Error al eliminar direcci�n:', err);
        res.status(500).json({ msg: 'Error del servidor al eliminar direcci�n.' });
    }
};
