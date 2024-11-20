const Product = require("../models/product");
const fs = require('fs');
const Order = require("../models/order");
const cartCheck = require("../middleware/user-cart-control"); // are there any products that are not available in the cart?
const stripe = require('stripe')('SECRET KEY');


//STRIPE IMPLEMANTATION TO SERVER SIDE
exports.getCheckout = async (req, res, next) => {
  try {
    await cartCheck(req.user._id);

    const user = await req.user.populate('cart.items.productId');
    const userCart = user.cart.items.filter((item) => item.productId !== null);
    let total = 0;
    for (let i of userCart) {
      total += i.productId.price * i.quantity;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: userCart.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.productId.title,
          },
          unit_amount: item.productId.price * 100,
        },
        quantity: item.quantity,
      
      })),
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
      cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
    });

    res.render('shop/checkout', {
      path: '/checkout',
      pageTitle: 'Checkout',
      products: userCart,
      total,
      sessionId: session.id,
    });
  } catch (err) {
    next(err);
  }
};
