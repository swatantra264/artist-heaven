const Product = require("../models/product");
const fileHelper = require("../util/file");
exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    errorMessage: req.flash("error"),
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  if (!image) {
    req.flash("error", "Attached file is not an image.");
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
    });
  }
  const imageUrl = image.path;
  const product = new Product({
    title: title,
    description: description,
    price: price,
    imageUrl: imageUrl,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      console.log("Created Product");
      req.flash("success", "Painting added successfully!");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    // Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,
        errorMessage: req.flash("error"),
      });
    })
    .catch((err) => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        req.flash("error", "Cannot edit a product by different admin!");
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save();
    })
    .then((result) => {
      console.log("UPDATED PRODUCT!");
      req.flash("success", "Painting updated successfully!");
      res.redirect("/admin/products");
    })
    .catch((err) => console.log(err));
};
exports.getProducts = (req, res, next) => {
  Product.find({
    userId: req.user._id,
  })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        errorMessage: req.flash("error"),
        success: req.flash("success"),
      });
    })
    .catch((err) => console.log(err));
};
exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error("Painting not found!"));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      req.flash("error", "Painting deleted successfully!");
      res.redirect("/admin/products");
    })
    .catch((err) => console.log(err));
};
