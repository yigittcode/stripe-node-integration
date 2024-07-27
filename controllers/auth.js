const User = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('node:crypto');
const { validationResult } = require('express-validator');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Use 'service' instead of 'host'
    auth: {
        user: 'yigitabdullah329@gmail.com',
        pass: 'jpua uebo usyb hqai'
    }
});

exports.getLogin = async (req, res, next) => {
    const errorMessage = req.query.errorMessage;
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: errorMessage
    });
};

exports.getSignup = (req, res, next) => {
    const errorMessage = req.query.errorMessage;
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: errorMessage
    });
};

exports.postLogin = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array()[0].msg;
        return res.redirect(`/login?errorMessage=${errorMsg}`);
    }

    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.redirect('/login?errorMessage=Invalid email or password.');
        }

        const doMatch = await bcrypt.compare(password, user.password);
        if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            await req.session.save();
            return res.redirect('/');
        }

        res.redirect('/login?errorMessage=Invalid email or password.');
    } catch (err) {
        next(err)
   }
};

exports.postSignup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMsg = errors.array()[0].msg;
        return res.redirect(`/signup?errorMessage=${errorMsg}`);
    }

    const { email, password, confirmPassword } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
        });

        await user.save();
        const info = await transporter.sendMail({
            to: email,
            subject: 'Welcome :)',
            text: 'Welcome to our family.'
        });
        console.log(info.messageId);

        res.redirect('/login');
    } catch (err) {
        next(err)

    }
};

exports.postLogout = (req, res, next) => {
    req.session.destroy((err) => {
        if (err) console.log(err);
        res.redirect('/');
    });
};

exports.getResetPassword = (req, res, next) => {
    const errorMessage = req.query.errorMessage;
    res.render('auth/reset-password', {
        path: '/reset',
        pageTitle: 'Reset',
        errorMessage
    });
};

exports.postResetPassword = async (req, res, next) => {
    const enteredMail = req.body.email;
    const existUser = await User.findOne({ email: enteredMail });
    if (existUser) {
        const resetPasswordToken = crypto.randomBytes(16).toString('hex');
        existUser.resetToken.token = resetPasswordToken;
        existUser.resetToken.expiration = Date.now() + 2 * 60 * 1000;
        console.log(existUser.resetToken.expiration.toString());
        await existUser.save();
        const info = await transporter.sendMail({
            to: enteredMail,
            subject: 'password reset key',
            html: `<a href="http://localhost:3000/update-password/${resetPasswordToken}"> Enter for update password </a>`
        });
        console.log(info.messageId);
        res.redirect('/login');
    } else {
        res.redirect('/reset-password?errorMessage=User not found.');
    }
};

exports.getUpdatePassword = async (req, res, next) => {
    const resetToken = req.params.token;
    const errorMessage = req.query.errorMessage;

    try {
        const user = await User.findOne({
            'resetToken.token': resetToken,
            'resetToken.expiration': { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect('/reset-password?errorMessage=User not found or invalid reset key.');
        }

        res.render('auth/update-password', {
            pageTitle: 'Update Password',
            resetToken: resetToken,
            email: user.email,
            path: '/update-password',
            errorMessage
        });
    } catch (err) {
        next(err)

    }
};

exports.postUpdatePassword = async (req, res, next) => {
    const { password, passwordConfirm, resetToken } = req.body;

    try {
        const user = await User.findOne({
            'resetToken.token': resetToken,
            'resetToken.expiration': { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect(`/reset-password?errorMessage=User not found or invalid reset key.`);
        }

        if (password !== passwordConfirm) {
            return res.redirect(`/update-password/${resetToken}?errorMessage=Passwords do not match.`);
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.resetToken = undefined;

        await user.save();

        const info = await transporter.sendMail({
            to: user.email,
            subject: 'Your password has been updated',
            html: `
                <p>Your password has been successfully updated.</p>
                <p>If you did not initiate this change, please contact us immediately.</p>`
        });
        console.log(info.messageId);

        res.redirect('/login?successMessage=Your password has been successfully updated.');
    } catch (err) {
        next(err)

    }
};
