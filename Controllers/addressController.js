
const Address = require('../Models/Address');
const validator = require('validator');

exports.addAddress = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id; // <-- Asegurar que lo obtenemos

        let {
            name, street, extNumber, intNumber,
            phone, postalCode, neighborhood, municipality, state
        } = req.body;

        // Validaciones básicas
        if (
            !name || !street || !extNumber || !phone || !postalCode ||
            !neighborhood || !municipality || !state
        ) {
            return res.status(400).json({ msg: 'Todos los campos obligatorios deben ser completados.' });
        }

        // Validaciones específicas
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/.test(name)) {
            return res.status(400).json({ msg: 'El nombre solo puede contener letras y espacios (2-50 caracteres).' });
        }

        if (!/^[0-9]{5}$/.test(postalCode)) {
            return res.status(400).json({ msg: 'El código postal debe tener 5 dígitos.' });
        }

        if (!/^[2-9]\d{9}$/.test(phone)) {
            return res.status(400).json({ msg: 'El número de teléfono debe tener 10 dígitos válidos (sin iniciar con 0 o 1).' });
        }

        if (!/^\d+$/.test(extNumber)) {
            return res.status(400).json({ msg: 'El número exterior debe ser numérico.' });
        }

        if (intNumber && !/^\d+$/.test(intNumber)) {
            return res.status(400).json({ msg: 'El número interior debe ser numérico si se proporciona.' });
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
            return res.status(409).json({ msg: 'Ya tienes registrada esta dirección.' });
        }

        const newAddress = new Address({
            userId, // <-- Aquí se guarda el ID del usuario
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
        res.status(201).json({ msg: 'Dirección añadida correctamente', address: savedAddress });
    } catch (err) {
        console.error('Error al añadir dirección:', err);
        res.status(500).json({ msg: 'Error del servidor al añadir dirección' });
    }
};

exports.deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const addressId = req.params.id;

        const address = await Address.findById(addressId);

        if (!address) {
            return res.status(404).json({ msg: 'Dirección no encontrada.' });
        }

        if (String(address.userId) !== String(userId)) {
            return res.status(403).json({ msg: 'No estás autorizado para eliminar esta dirección.' });
        }

        await Address.findByIdAndDelete(addressId);

        res.status(200).json({ msg: 'Dirección eliminada correctamente.' });
    } catch (err) {
        console.error('Error al eliminar dirección:', err);
        res.status(500).json({ msg: 'Error del servidor al eliminar dirección.' });
    }
};
