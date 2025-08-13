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
        const userId = req.user.id;
        const { addressId, cardId, products } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ msg: 'El carrito está vacío.' });
        }

        // Prevenir reuse rápido de tarjeta
        const recentOrder = await Order.findOne({
            card: cardId,
            createdAt: { $gt: Date.now() - 60 * 1000 }
        });
        if (recentOrder) {
            return res.status(429).json({ msg: 'Espera un momento antes de usar esta tarjeta nuevamente.' });
        }

        // Validación de productos y cálculo del total
        let totalAmount = 0;
        const productDetails = [];

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(404).json({ msg: `Producto no encontrado: ${item.productId}` });

            const sizeInfo = product.sizes.find(s => s.size === item.size);
            if (!sizeInfo || sizeInfo.stock < item.quantity) {
                return res.status(400).json({ msg: `Stock insuficiente para ${product.name} - Talla ${item.size}` });
            }

            totalAmount += product.price * item.quantity;
            productDetails.push({
                product: product._id,
                quantity: item.quantity,
                priceAtPurchase: product.price
            });
        }

        // Validación de dirección
        const address = await Address.findById(addressId);
        if (!address || address.userId.toString() !== userId) {
            return res.status(403).json({ msg: 'Dirección inválida o no autorizada.' });
        }

        // Validación de tarjeta
        const card = await Card.findById(cardId);
        if (!card || card.userId.toString() !== userId) {
            return res.status(403).json({ msg: 'Tarjeta inválida o no autorizada.' });
        }

        // Procesar pago (TEST/DEV con confirmación server-side)
        const idempotencyKey = `order_${userId}_${Date.now()}`; // o usa tu orderNumber si ya lo generaste

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // centavos
            currency: 'mxn',
            payment_method: 'pm_card_visa',        // método de prueba que no requiere 3DS
            confirm: true,                         // confirmamos aquí mismo
            automatic_payment_methods: { enabled: true }
        }, { idempotencyKey });

        if (paymentIntent.status !== 'succeeded') {
            console.error('Stripe payment not succeeded:', paymentIntent.status, paymentIntent.last_payment_error);
            return res.status(400).json({ msg: 'Error en el pago con Stripe.', stripeStatus: paymentIntent.status });
        }

        // Guarda el id del intent para rastreo/reembolsos
        const paymentIntentId = paymentIntent.id;

        // Generar número de orden
        const orderNumber = crypto.randomBytes(5).toString('hex').toUpperCase();

        // Guardar orden
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

        // Correos
        const clientEmail = req.user.email;
        const itemsHtml = productDetails.map(p => `<li>${p.quantity} x $${p.priceAtPurchase} MXN</li>`).join('');

        const clientMessage = {
            to: clientEmail,
            subject: 'Confirmación de tu compra en Sideways',
            html: `<h1>Gracias por tu compra</h1><ul>${itemsHtml}</ul><p>Total: $${totalAmount} MXN</p>`
        };

        const providerMessage = {
            to: 'betakanton9@gmail.com',
            subject: 'Nueva orden recibida',
            html: `<h2>Detalles de la orden</h2><ul>${itemsHtml}</ul><p>Total: $${totalAmount} MXN</p><p>Dirección: ${address.street} #${address.extNumber}</p>`
        };

        await transporter.sendMail(clientMessage);
        await transporter.sendMail(providerMessage);

        res.status(201).json({ msg: 'Orden creada exitosamente', orderId: order._id });

    } catch (err) {
        console.error('Error al crear orden:', err);
        res.status(500).json({ msg: 'Error en el servidor al crear la orden.' });
    }
};
// Actualizar estatus de una orden (solo admin)
exports.updateOrderStatus = async (req, res) => {
    try {
        // Autorización: admin por role o flag
        const isAdmin = req.user && (req.user.role === 'admin' || req.user.isAdmin === true);
        if (!isAdmin) {
            return res.status(403).json({ msg: 'Acceso denegado. Solo administradores pueden actualizar el estatus de la orden.' });
        }

        const { id } = req.params;
        const { status } = req.body;

        // Valida estatus permitido (coincide con tu modelo)
        const allowed = ['Pendiente', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ msg: `Estatus inválido. Usa uno de: ${allowed.join(', ')}` });
        }

        // Trae la orden
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ msg: 'Orden no encontrada' });

        // Si es el mismo estatus, evita trabajo innecesario
        if (order.status === status) {
            return res.status(200).json({ msg: 'La orden ya tiene este estatus', order });
        }

        const prevStatus = order.status;
        order.status = status;

        // Campos derivados
        if (status === 'Pagado') {
            order.processedAt = new Date();
            order.isCancelled = false;
        }
        if (status === 'Cancelado') {
            order.isCancelled = true;
        }
        if (status === 'Entregado') {
            // aquí podrías marcar flags adicionales si tu lógica lo requiere
        }

        // Historial
        order.statusHistory.push({ status });

        await order.save();
        return res.status(200).json({
            msg: 'Estatus de la orden actualizado correctamente',
            prevStatus,
            order
        });
    } catch (err) {
        console.error('Error al actualizar estatus de la orden:', err);
        return res.status(500).json({ msg: 'Error en el servidor al actualizar el estatus.' });
    }
};

