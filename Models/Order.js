const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    card: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        required: true
    },
    products: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            priceAtPurchase: {
                type: Number,
                required: true,
                min: 0
            }
        }
    ],
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Pendiente', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'],
        default: 'Pendiente'
    },
    statusHistory: [
        {
            status: {
                type: String,
                enum: ['Pendiente', 'Pagado', 'Enviado', 'Entregado', 'Cancelado'],
                required: true
            },
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ],
    isRefunded: {
        type: Boolean,
        default: false
    },
    isCancelled: {
        type: Boolean,
        default: false
    },
    cancelReason: {
        type: String,
        trim: true,
        maxlength: 300
    },
    processedAt: {
        type: Date
    },
    paymentIntentId: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Índices para queries eficientes
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: 1 });

// Validación previa al guardado (opcional)
orderSchema.pre('save', function (next) {
    if (this.products.length === 0) {
        return next(new Error('La orden debe contener al menos un producto.'));
    }

    const sum = this.products.reduce((acc, item) => acc + (item.priceAtPurchase * item.quantity), 0);
    if (this.totalAmount < sum) {
        return next(new Error('El monto total no puede ser menor al subtotal de productos.'));
    }

    next();
});

module.exports = mongoose.model('Order', orderSchema);
