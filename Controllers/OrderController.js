const Order = require('../Models/Order');
const Product = require('../Models/Product');
const Address = require('../Models/Address');
const Card = require('../Models/Card');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Transportador de correos
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id; // ? validación 1: solo el usuario autenticado puede ordenar
        const { addressId, cardId, products } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ msg: 'El carrito está vacío.' });
        }

        // Validación 4: prevenir múltiples órdenes con misma tarjeta en poco tiempo
        const recentOrder = await Order.findOne({
            card: cardId,
            createdAt: { $gt: Date.now() - 60 * 1000 } // últimos 60 segundos
        });
        if (recentOrder) {
            return res.status(429).json({ msg: 'Espera un momento antes de usar esta tarjeta nuevamente.' });
        }

        // Validar existencia y stock
        let totalAmount = 0;
        const productDetails = [];

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ msg: `Producto no encontrado: ${item.productId}` });

            const sizeInfo = product.sizes.find(s => s.size === item.size);
            if (!sizeInfo || sizeInfo.stock < item.quantity) {
                return res.status(400).json({ msg: `Stock insuficiente para ${product.name} - Talla ${item.size}` });
            }

            // Validación 2: Nunca usar precio del frontend
            totalAmount += product.price * item.quantity;
            productDetails.push({
                product: product._id,
                quantity: item.quantity,
                priceAtPurchase: product.price
            });
        }

        // Validar dirección y tarjeta
        const address = await Address.findById(addressId);
        if (!address || address.userId.toString() !== userId) {
            return res.status(403).json({ msg: 'Dirección inválida o no autorizada.' });
        }

        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ msg: 'Tarjeta no encontrada.' });

        // Crear pago con Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: 'mxn',
            payment_method_types: ['card']
        });

        // Validación 7: validar estado de pago
        if (!paymentIntent || paymentIntent.status !== 'succeeded') {
            // Validación 8: registrar intento fallido
            console.error('Stripe payment failed:', paymentIntent);
            return res.status(400).json({ msg: 'Error en el pago con Stripe.' });
        }

        // Generar número único de orden
        const orderNumber = crypto.randomBytes(5).toString('hex').toUpperCase();

        // Crear orden
        const order = new Order({
            orderNumber,
            user: userId,
            address: address._id,
            card: card._id,
            products: productDetails,
            totalAmount,
            status: 'Pagado',
            statusHistory: [{ status: 'Pagado' }]
        });

        await order.save();

        // Actualizar stock
        for (const item of products) {
            await Product.updateOne(
                { _id: item.productId, 'sizes.size': item.size },
                { $inc: { 'sizes.$.stock': -item.quantity } }
            );
        }

        // Enviar correos
        const clientEmail = req.user.email;
        const itemsHtml = productDetails.map(p => `<li>${p.quantity} x ${p.priceAtPurchase} MXN</li>`).join('');

        const clientMessage = {
            to: clientEmail,
            subject: 'Confirmación de tu compra en Sideways',
            html: `<h1>Gracias por tu compra</h1><ul>${itemsHtml}</ul><p>Total: ${totalAmount} MXN</p>`
        };

        const providerMessage = {
            to: 'betakanton9@gmail.com',
            subject: 'Nueva orden recibida',
            html: `<h2>Detalles de la orden</h2><ul>${itemsHtml}</ul><p>Total: ${totalAmount} MXN</p><p>Dirección: ${address.street} #${address.extNumber}</p>`
        };

        await transporter.sendMail(clientMessage);
        await transporter.sendMail(providerMessage);

        res.status(201).json({ msg: 'Orden creada exitosamente', orderId: order._id });
    } catch (err) {
        console.error('Error al crear orden:', err);
        res.status(500).json({ msg: 'Error en el servidor al crear la orden.' });
    }
};
