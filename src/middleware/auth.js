const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

// JWT token oluştur
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role,
            username: user.username
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
};

// Token doğrula
const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Erişim token\'ı gerekli'
        });
    }
    
    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Geçersiz token'
        });
    }
};

// Admin kontrolü
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin yetkisi gerekli'
        });
    }
    next();
};

// Kullanıcı kontrolü (kendi verisi veya admin)
const requireOwnershipOrAdmin = (req, res, next) => {
    const userId = parseInt(req.params.userId || req.body.userId);
    
    if (req.user.role === 'admin' || req.user.id === userId) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Bu işlem için yetkiniz yok'
        });
    }
};

// Şifre hash'le
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// Şifre doğrula
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

module.exports = {
    generateToken,
    verifyToken,
    requireAdmin,
    requireOwnershipOrAdmin,
    hashPassword,
    comparePassword
};
