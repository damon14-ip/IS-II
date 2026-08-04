// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

exports.verificarToken = (req, res, next) => {
    // 1. Buscamos el token en las cabeceras de la petición
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ success: false, message: 'Acceso denegado: No se proporcionó un token de seguridad.' });
    }

    // 2. El formato estándar es "Bearer <token>", así que lo separamos
    const token = authHeader.split(' ')[1]; 
    if (!token) {
        return res.status(403).json({ success: false, message: 'Formato de token inválido.' });
    }

    try {
        // 3. Verificamos que el token sea auténtico y no haya expirado
        // Nota: En producción, el 'secret_key' debe ir en tu archivo .env
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'llave_super_secreta_ceramic_dent');
        
        // 4. Guardamos los datos del usuario en la request por si el controlador los necesita
        req.usuario = decoded; 
        
        // 5. Todo está en orden, dejamos pasar la petición
        next(); 
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token expirado o corrupto. Inicie sesión nuevamente.' });
    }
};