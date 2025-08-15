// controllers/OrderController.js
const Order = require('../Models/Order');
const Product = require('../Models/Product');
const Address = require('../Models/Address');
const Card = require('../Models/Card');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { removePurchasedFromCart } = require('../Utils/clearCart');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const normSize = s => String(s || '').trim();

exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { addressId, cardId, products } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ msg: 'El carrito está vacío.' });
        }

        // Anti reuse rápido de la MISMA tarjeta (opcional)
        const recentOrder = await Order.findOne({
            card: cardId,
            createdAt: { $gt: Date.now() - 60 * 1000 }
        });
        if (recentOrder) {
            return res.status(429).json({ msg: 'Espera un momento antes de usar esta tarjeta nuevamente.' });
        }

        // Validación de dirección (dueño)
        const address = await Address.findById(addressId);
        if (!address || String(address.userId) !== String(userId)) {
            return res.status(403).json({ msg: 'Dirección inválida o no autorizada.' });
        }

        // Validación de tarjeta (dueño) - OJO: en Card el campo es "user"
        const card = await Card.findById(cardId);
        if (!card || String(card.user) !== String(userId)) {
            return res.status(403).json({ msg: 'Tarjeta inválida o no autorizada.' });
        }

        // Validación de productos y cálculo total
        let totalAmount = 0;
        const productDetails = [];

        for (const item of products) {
            const sizeReq = normSize(item.size);
            const product = await Product.findById(item.productId);
            if (!product || !product.isActive) {
                return res.status(404).json({ msg: `Producto no disponible: ${item.productId}` });
            }

            const sizeInfo = product.sizes.find(s => s.size === sizeReq);
            if (!sizeInfo) {
                return res.status(400).json({ msg: `Talla inválida para ${product.name}: ${sizeReq}` });
            }
            if (sizeInfo.stock < Number(item.quantity)) {
                return res.status(400).json({ msg: `Stock insuficiente para ${product.name} - Talla ${sizeReq}` });
            }

            totalAmount += product.price * Number(item.quantity);
            productDetails.push({
                product: product._id,
                quantity: Number(item.quantity),
                priceAtPurchase: product.price
            });
        }

        // Generar número de orden ANTES de crear el PaymentIntent (sirve p/ idempotencia y metadata)
        const orderNumber = crypto.randomBytes(5).toString('hex').toUpperCase();

        // Procesar pago (server-side, test)
        const idempotencyKey = `order_${orderNumber}_${userId}`;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: 'mxn',
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            payment_method: 'pm_card_visa',
            confirm: true,
            metadata: {
                order_number: orderNumber,
                user_id: String(userId)
            }
        }, { idempotencyKey });

        if (paymentIntent.status !== 'succeeded') {
            console.error('[order] Stripe status:', paymentIntent.status, paymentIntent.last_payment_error);
            return res.status(400).json({ msg: 'Error en el pago con Stripe.', stripeStatus: paymentIntent.status });
        }

        const paymentIntentId = paymentIntent.id;

        // Guardar orden
        const order = new Order({
            orderNumber,
            user: userId,
            address: address._id,
            card: card._id,
            products: productDetails,
            totalAmount,
            status: 'Pagado',
            statusHistory: [{ status: 'Pagado' }],
            paymentIntentId     // <<<< guarda el intent
        });

        await order.save();

        // Actualizar stock
        for (const item of products) {
            await Product.updateOne(
                { _id: item.productId, 'sizes.size': normSize(item.size) },
                { $inc: { 'sizes.$.stock': -Number(item.quantity) } }
            );
        }

        // Limpiar del carrito SOLO lo comprado
        await removePurchasedFromCart(userId, products);

        // Correos (no bloqueantes entre sí)
        const clientEmail = req.user.email;
        const itemsHtml = productDetails
            .map(p => `<li>${p.quantity} x $${p.priceAtPurchase} MXN</li>`)
            .join('');

        const clientMessage = {
            to: clientEmail,
            subject: 'Confirmación de tu compra en Sideways',
            html: `<h1>Gracias por tu compra</h1>
             <p>Orden: <strong>${orderNumber}</strong></p>
             <ul>${itemsHtml}</ul>
             <p>Total: <strong>$${totalAmount} MXN</strong></p>`
        };

        const providerMessage = {
            to: 'betakanton9@gmail.com',
            subject: 'Nueva orden recibida',
            html: `<h2>Orden ${orderNumber}</h2>
             <ul>${itemsHtml}</ul>
             <p>Total: $${totalAmount} MXN</p>
             <p>Dirección: ${address.street} #${address.extNumber}</p>`
        };

        // Que un fallo de correo no tumbe la respuesta
        Promise.allSettled([
            transporter.sendMail(clientMessage),
            transporter.sendMail(providerMessage)
        ]).catch(() => { });

        return res.status(201).json({ msg: 'Orden creada exitosamente', orderId: order._id });

    } catch (err) {
        console.error('Error al crear orden:', err);
        return res.status(500).json({ msg: 'Error en el servidor al crear la orden.' });
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
// Actualizar estatus de una orden (solo admin). Si es "Entregado", se elimina de la BD.
exports.updateOrderStatus = async (req, res) => {
    try {
        // Autorización: solo admin
        const isAdmin = req.user && (req.user.role === 'admin' || req.user.isAdmin === true);
        if (!isAdmin) {
            return res.status(403).json({ msg: 'Acceso denegado. Solo administradores pueden actualizar el estatus de la orden.' });
        }

        const { id } = req.params;
        const { status } = req.body;
        const allowed = ['Pendiente', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'];

        if (!allowed.includes(status)) {
            return res.status(400).json({ msg: `Estatus inválido. Usa uno de: ${allowed.join(', ')}` });
        }

        // Si el nuevo estado es "Entregado", elimina directamente la orden
        if (status === 'Entregado') {
            // Opcional: podrías verificar que exista antes de borrar si quieres responder 404 en caso de no encontrada:
            const existing = await Order.findById(id).select('_id orderNumber');
            if (!existing) return res.status(404).json({ msg: 'Orden no encontrada' });

            await Order.deleteOne({ _id: id });
            return res.status(200).json({
                msg: 'Orden marcada como entregada y eliminada de la base de datos',
                orderId: id,
                orderNumber: existing.orderNumber
            });
        }

        // Para cualquier otro estado: actualizar normalmente
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ msg: 'Orden no encontrada' });

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
            // (Opcional) aquí podrías gestionar reembolso Stripe si aplica.
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

