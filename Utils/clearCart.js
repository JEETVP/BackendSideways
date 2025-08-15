// utils/clearCart.js
const ShoppingCart = require('../Models/ShoppingCart');

/**
 * Elimina del carrito los productos que ya fueron comprados.
 * @param {String} userId - ID del usuario dueño del carrito
 * @param {Array} purchasedItems - [{ productId, size, quantity }]
 */
async function removePurchasedFromCart(userId, purchasedItems) {
    try {
        if (!Array.isArray(purchasedItems) || purchasedItems.length === 0) return;

        const cart = await ShoppingCart.findOne({ user: userId });
        if (!cart) return;

        // Filtrar el carrito quitando los productos comprados
        cart.items = cart.items.filter(cartItem => {
            return !purchasedItems.some(purchased =>
                String(purchased.productId) === String(cartItem.product) &&
                String(purchased.size).trim() === String(cartItem.size).trim()
            );
        });

        await cart.save();
    } catch (err) {
        console.error('[clearCart] Error al eliminar productos comprados del carrito:', err);
    }
}

module.exports = { removePurchasedFromCart };
