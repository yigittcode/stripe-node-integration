const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const Product = require("../models/product");
const path = require('path');


exports.getAddProduct = (req, res, next) => {
  const errorMessage = req.query.errorMessage;

  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    errorMessage,
  });
};

exports.postAddProduct = async (req, res, next) => {
  //console.log(req.query._csrf == req.body._csrf);
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg;
    return res.redirect(`/admin/add-product?errorMessage=${errorMsg}`);
  }
  const { title, price, description } = req.body;
  

  const image = path.join('images', req.file.filename).replace(/\\/g, '/');
  
  const product = new Product({
    title,
    price,
    description,
    image: image,
    userId: req.user,
  });
  try {
    await product.save();
    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.getEditProduct = async (req, res, next) => {
  const errorMessage = req.query.errorMessage;

  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  try {
    const product = await Product.findById(prodId);
    if (!product) {
      return res.redirect("/");
    }
    res.render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: editMode,
      product,
      errorMessage,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.postEditProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMsg = errors.array()[0].msg;
    return res.redirect(`/admin/edit-product/${req.body.productId}?errorMessage=${errorMsg}&edit=true`);
  }

  const { productId, title, price, description } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.redirect("/");
    }
    product.title = title;
    product.price = price;
    product.description = description;
    
    if (req.file) {
      product.image = path.join('images', req.file.filename).replace(/\\/g, '/');
    }
    
    await product.save();
    res.redirect("/admin/products");
  } catch (err) {
    console.error(err);
    next(err);
  }
};


exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ userId: req.user._id });
    res.render("admin/products", {
      prods: products,
      pageTitle: "Admin Products",
      path: "/admin/products",
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.postDeleteProduct = async (req, res, next) => {
  try {
   const prodId = req.params.productID;
   await Product.findByIdAndDelete(prodId);
    res.json({message : "succesfull"})
  } catch (err) {
    res.json({message : "unsuccesfull"})
    next(err);
  }

};
