const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'troque-este-segredo-em-producao';

function signToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            role: user.role,
            name: user.name,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Não autenticado.' });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
    } catch {
        return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
}

module.exports = {
    signToken,
    requireAuth
};
