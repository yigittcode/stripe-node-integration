const mongoose = require('mongoose');
const User = require('../models/user'); 
const Product = require('../models/product'); 

async function checkUserCart(userId) {
    try {
        // Find the user by userId and only retrieve the 'cart' field
        const user = await User.findById(userId, { cart: 1 });
        
        // If user is not found, log an error and return from the function
        if (!user) {
            console.log(`User with ID ${userId} not found.`);
            return;
        }

        // Get the cart object from the user document
        const cart = user.cart;

        // If cart is empty or does not exist, log a message and return
        if (!cart || !cart.items || cart.items.length === 0) {
            console.log(`User ${userId} has no items in the cart.`);
            return; 
        }

        // Retrieve all products from the 'products' collection, fetching only the '_id' field
        const allProducts = await Product.find({}, { _id: 1 });

        // Iterate through each item in the user's cart
        for (let i = 0; i < cart.items.length; i++) {
            const cartItem = cart.items[i];
            const productId = cartItem.productId;

            // Check if the product with productId exists in the 'products' collection
            const productExists = allProducts.some(product => product._id.toString() === productId.toString());

            // If product does not exist, log a message and remove the item from the cart
            if (!productExists) {
                console.log(`Product ${productId} not found in Products collection. Removing from cart.`);
                cart.items.splice(i, 1);
                i--; // Decrement index because we removed an item from array
            }
        }

        // Save the updated user document with the modified cart
        await user.save();
        console.log(`Cart of user ${userId} has been updated.`);
    } catch (error) {
        console.error('Error checking user cart:', error);
    }
}

module.exports = checkUserCart;


//on-demand check approach and Cron Job Approach