const User = require('../Models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendVerificationEmail = async (user, req) => {
    const url = `${req.protocol}://${req.get('host')}/api/auth/verify/${user.verificationToken}`;
    await transporter.sendMail({
        to: user.email,
        subject: 'Verifica tu cuenta de Sideways',
        html: `<p>Haz clic en el siguiente enlace para verificar tu cuenta:</p><a href="${url}">${url}</a>`,
    });
};

exports.handleGoogleCallback = async (req, res) => {
    const user = req.user; // Viene desde Passport
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
        msg: 'Autenticación con Google exitosa',
        token,
        user: {
            id: user._id,
            email: user.email
        }
    });
};

exports.register = async (req, res) => {
    const { email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ msg: 'Este correo ya está registrado.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
        email,
        password: hashedPassword,
        verificationToken,
    });

    await newUser.save();
    await sendVerificationEmail(newUser, req);

    res.status(201).json({ msg: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.' });
};

exports.verifyEmail = async (req, res) => {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
        return res.status(400).send(`
            <html>
                <head><title>Error</title></head>
                <body>
                    <h1>Token inválido o expirado.</h1>
                </body>
            </html>
        `);
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).send(`
        <html>
            <head><title>Verificado</title></head>
            <body>
                <h1>¡Tu cuenta ha sido verificada exitosamente!</h1>
                <p>Ya puedes iniciar sesión en Sideways.</p>
            </body>
        </html>
    `);
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ msg: 'Correo o contraseña incorrectos.' });

    if (!user.isVerified) {
        return res.status(403).json({ msg: 'Verifica tu correo antes de iniciar sesión.' });
    }

    if (user.lockUntil && user.lockUntil > Date.now()) {
        return res.status(403).json({ msg: 'Tu cuenta está bloqueada temporalmente. Intenta más tarde.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 10) {
            user.lockUntil = Date.now() + 30 * 60 * 1000; // Bloqueo por 30 minutos
        }
        await user.save();
        return res.status(400).json({ msg: 'Correo o contraseña incorrectos.' });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ token });
};

