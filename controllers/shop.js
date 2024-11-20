const Product = require("../models/product");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const Order = require("../models/order");
const cartCheck = require("../middleware/user-cart-control");
const path = require("path");
const stripe = require('stripe')('SECRET KEY');
const MAX_PRODUCT_PER_PAGE = 3;
exports.getProducts = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const allProductCount = await Product.countDocuments();
     const products = await Product.find().skip((page - 1) * MAX_PRODUCT_PER_PAGE).limit(MAX_PRODUCT_PER_PAGE);
    res.render("shop/product-list", {
     prods: products,
     pageTitle: "All Products",
     path: "/products",
    pageCount : Math.ceil((allProductCount / MAX_PRODUCT_PER_PAGE)),
    currentPage : page
    });
  } catch (err) {
    next(err);
  }
};

exports.getProduct = async (req, res, next) => {
  const prodId = req.params.productId;
  try {
    const product = await Product.findById(prodId);
    res.render("shop/product-detail", {
      product: product,
      pageTitle: product.title,
      path: "/products",
    });
  } catch (err) {
    next(err);
  }
};

exports.getIndex = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const allProductCount = await Product.countDocuments();
    
    const products = await Product.find().skip((page - 1) * MAX_PRODUCT_PER_PAGE).limit(MAX_PRODUCT_PER_PAGE);
    res.render("shop/index", {
      prods: products,
      pageTitle: "Shop",
      path: "/",
    pageCount : Math.ceil((allProductCount / MAX_PRODUCT_PER_PAGE)),
    currentPage : page

    });
  } catch (err) {
    next(err);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    await cartCheck(req.user._id);

    const user = await req.user.populate("cart.items.productId");

    const userCart = user.cart.items.filter((item) => item.productId !== null);

    res.render("shop/cart", {
      path: "/cart",
      pageTitle: "Your Cart",
      products: userCart,
    });
  } catch (err) {
    next(err);
  }
};

exports.postCart = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    const product = await Product.findById(prodId);
    await req.user.addToCart(product);
    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
};

exports.postCartDeleteProduct = async (req, res, next) => {
  const prodId = req.body.productId;
  try {
    await req.user.removeFromCart(prodId);
    res.redirect("/cart");
  } catch (err) {
    next(err);
  }
};

exports.postOrder = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items.map((i) => {
      return { quantity: i.quantity, product: { ...i.productId._doc } };
    });
    const order = new Order({
      user: {
        email: req.user.email,
        userId: req.user,
      },
      products: products,
    });
    await order.save();
    await req.user.clearCart();
    res.redirect("/orders");
  } catch (err) {
    next(err);
  }
};
exports.getSuccesCheckout = async (req, res, next) => {
  try {
    const user = await req.user.populate("cart.items.productId");
    const products = user.cart.items.map((i) => {
      return { quantity: i.quantity, product: { ...i.productId._doc } };
    });
    const order = new Order({
      user: {
        email: req.user.email,
        userId: req.user,
      },
      products: products,
    });
    await order.save();
    await req.user.clearCart();
    res.render('shop/successCheckout', {
      pageTitle : 'Thank you!',
      path : '/succesCheckout'
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ "user.userId": req.user._id });
    res.render("shop/orders", {
      path: "/orders",
      pageTitle: "Your Orders",
      orders: orders,
      
    });
  } catch (err) {
    next(err);
  }
};




exports.getInvoice = async (req, res, next) => {
  const orderID = req.params.orderID;

  try {
    const order = await Order.findById(orderID);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `filename="invoice.pdf"`);

    doc.fontSize(10).text('Invoice Content', { align: 'center' });

    doc.font('Helvetica-Bold').text('User Information:');
    doc.font('Helvetica').text(`Email: ${order.user.email}`);
    doc.font('Helvetica').text(`User ID: ${order.user.userId}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Order Details:');
    doc.moveDown();
    let totalPrice = 0;
    order.products.forEach((prod, index) => {
      doc.font('Helvetica').text(`${index + 1}. Product Name: ${prod.product.title}`);
      doc.font('Helvetica').text(`   Quantity: ${prod.quantity}`);
      doc.font('Helvetica').text(`   Price: ${prod.product.price}`);
      totalPrice += +prod.quantity *  +prod.product.price;
      doc.moveDown();
    });

    doc.font('Helvetica-Bold').text(`Total Price: ${totalPrice} TL`);

    doc.end();

    
    doc.pipe(res);

  } catch (err) {
    console.error(err);
    next(err);

  }
};



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