const User = require("../models/user");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const sendGridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");
const transporter = nodemailer.createTransport(
  sendGridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: req.flash("error"),
    success: req.flash("message"),
  });
};
exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: req.flash("error"),
    success: req.flash("message"),
  });
};
exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  if (password.toString() !== confirmPassword.toString()) {
    req.flash("error", "Passwords should match!");
    return res.redirect("/signup");
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      success: req.flash("message"),
    });
  }
  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash("error", "Email exists already!");
        return res.redirect("/login");
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: {
              items: [],
            },
          });
          return user.save();
        })
        .then((result) => {
          req.flash("message", "Signed up successfully!");
          res.redirect("/login");
          return transporter.sendMail({
            to: email,
            from: "ritvika30@gmail.com",
            subject: "Signup verification on Node Shop",
            html: "<p><div>Thank you for signing up! Looking forward to have a great time with you.</div> <div>Regards, CEO</div></p>",
          });
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid email or password.");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((result) => {
          if (result) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            req.session.isAdmin = user.isAdmin;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("error", "Invalid email or password");
          res.redirect("/login");
        })
        .catch((err) => {
          res.redirect("/login");
        });
    })
    .catch((err) => console.log(err));
};
exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};
exports.getReset = (req, res, next) => {
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: req.flash("error"),
    success: req.flash("success"),
  });
};
exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email!");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        req.flash("success", "Check your email for password reset!");
        res.redirect("/");
        transporter.sendMail({
          to: req.body.email,
          from: "ritvika30@gmail.com",
          subject: "Password Reset",
          html: `
        <p>You requested a password reset.</p>
        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to reset your password</p>
        `,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};
exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: {
      $gt: Date.now(),
    },
  })
    .then((user) => {
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "Update Password",
        errorMessage: req.flash("error"),
        success: req.flash("success"),
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};
exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: {
      $gt: Date.now(),
    },
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPassword) => {
      resetUser.password = hashedPassword;
      resetUser.resetToken = null;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      req.flash("success", "Password Reset successfully!");
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
    });
};
