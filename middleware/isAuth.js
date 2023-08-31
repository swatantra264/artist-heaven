module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    req.flash("error", "You are not logged in!");
    return res.redirect("/login");
  }
  next();
};
