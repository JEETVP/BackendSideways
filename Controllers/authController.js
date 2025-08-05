const User = require('../Models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configurar Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Enviar correo de verificación
const sendVerificationEmail = async (user, req) => {
    const url = `${req.protocol}://${req.get('host')}/api/auth/verify/${user.verificationToken}`;
    await transporter.sendMail({
        to: user.email,
        subject: 'Verifica tu cuenta de Sideways',
        html: `<p>Haz clic en el siguiente enlace para verificar tu cuenta:</p><a href="${url}">${url}</a>`,
    });
};

// ===================== REGISTER =====================
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

// ===================== VERIFY EMAIL =====================
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

// ===================== LOGIN =====================
exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ msg: 'Correo o contraseña incorrectos.' });
    if (!user.isVerified) return res.status(403).json({ msg: 'Verifica tu correo antes de iniciar sesión.' });
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
    console.log('JWT_SECRET desde backend:', process.env.JWT_SECRET);
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ token: accessToken });
};

// ===================== REFRESH TOKEN =====================
exports.refreshToken = (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ msg: 'No autorizado. No hay refresh token.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const newAccessToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ token: newAccessToken });
    } catch (err) {
        res.status(403).json({ msg: 'Refresh token inválido o expirado.' });
    }
};

// ===================== LOGOUT =====================
exports.logout = (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
    });
    res.status(200).json({ msg: 'Sesión cerrada correctamente.' });
};

// ===================== GOOGLE LOGIN =====================
exports.handleGoogleCallback = async (req, res) => {
    const user = req.user;
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        msg: 'Autenticación con Google exitosa',
        token: accessToken,
        user: {
            id: user._id,
            email: user.email
        }
    });
};

// ===================== ELIMINAR USUARIO POR CORREO =====================
exports.deleteUserByEmail = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOneAndDelete({ email });
        if (!user) return res.status(404).json({ msg: 'Usuario no encontrado.' });

        res.status(200).json({ msg: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ msg: 'Error del servidor.' });
    }
};


