const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { 
    generateToken, 
    verifyToken, 
    requireAdmin, 
    hashPassword, 
    comparePassword 
} = require('../middleware/auth');

// Kullanıcı kayıt
router.post('/register', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            username,
            email,
            password
        } = req.body;
        
        // Gerekli alanları kontrol et
        if (!firstName || !lastName || !username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Tüm alanlar zorunludur'
            });
        }
        
        // Email format kontrolü
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir email adresi giriniz'
            });
        }
        
        // Şifre uzunluk kontrolü
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Şifre en az 6 karakter olmalıdır'
            });
        }
        
        // Kullanıcı adı ve email benzersizlik kontrolü
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bu kullanıcı adı veya email zaten kayıtlı'
            });
        }
        
        // Şifreyi hash'le
        const passwordHash = await hashPassword(password);
        
        // Kullanıcıyı kaydet
        const result = await db.query(`
            INSERT INTO users (first_name, last_name, username, email, password_hash, role)
            VALUES (?, ?, ?, ?, ?, 'user')
        `, [firstName, lastName, username, email, passwordHash]);
        
        // Token oluştur
        const token = generateToken({
            id: result.insertId,
            email: email,
            role: 'user',
            username: username
        });
        
        res.status(201).json({
            success: true,
            message: 'Kullanıcı başarıyla kaydedildi',
            token: token,
            user: {
                id: result.insertId,
                firstName: firstName,
                lastName: lastName,
                username: username,
                email: email,
                role: 'user'
            }
        });
        
    } catch (error) {
        console.error('Kullanıcı kayıt hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı kaydedilirken hata oluştu'
        });
    }
});

// Kullanıcı giriş
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı adı ve şifre gerekli'
            });
        }
        
        // Kullanıcıyı bul (username veya email ile)
        const users = await db.query(`
            SELECT id, first_name, last_name, username, email, password_hash, role, is_active
            FROM users 
            WHERE (username = ? OR email = ?) AND is_active = TRUE
        `, [username, username]);
        
        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı adı veya şifre hatalı'
            });
        }
        
        const user = users[0];
        
        // Şifre kontrolü
        const isPasswordValid = await comparePassword(password, user.password_hash);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Kullanıcı adı veya şifre hatalı'
            });
        }
        
        // Son giriş tarihini güncelle
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );
        
        // Token oluştur
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            username: user.username
        });
        
        res.json({
            success: true,
            message: 'Giriş başarılı',
            token: token,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('Kullanıcı giriş hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Giriş yapılırken hata oluştu'
        });
    }
});

// Kullanıcı profili getir
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await db.query(`
            SELECT id, first_name, last_name, username, email, role, is_active, last_login, created_at
            FROM users 
            WHERE id = ?
        `, [req.user.id]);
        
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: user[0].id,
                firstName: user[0].first_name,
                lastName: user[0].last_name,
                username: user[0].username,
                email: user[0].email,
                role: user[0].role,
                isActive: user[0].is_active,
                lastLogin: user[0].last_login,
                createdAt: user[0].created_at
            }
        });
        
    } catch (error) {
        console.error('Profil getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Profil bilgileri getirilemedi'
        });
    }
});

// Kullanıcı profili güncelle
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;
        
        // Email benzersizlik kontrolü
        if (email) {
            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.id]
            );
            
            if (existingUser.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu email adresi zaten kullanılıyor'
                });
            }
        }
        
        // Güncelleme alanlarını hazırla
        const updateFields = [];
        const updateValues = [];
        
        if (firstName) {
            updateFields.push('first_name = ?');
            updateValues.push(firstName);
        }
        
        if (lastName) {
            updateFields.push('last_name = ?');
            updateValues.push(lastName);
        }
        
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Güncellenecek alan bulunamadı'
            });
        }
        
        updateValues.push(req.user.id);
        
        await db.query(`
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);
        
        res.json({
            success: true,
            message: 'Profil başarıyla güncellendi'
        });
        
    } catch (error) {
        console.error('Profil güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Profil güncellenirken hata oluştu'
        });
    }
});

// Şifre değiştir
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Mevcut şifre ve yeni şifre gerekli'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Yeni şifre en az 6 karakter olmalıdır'
            });
        }
        
        // Mevcut şifreyi kontrol et
        const user = await db.query(
            'SELECT password_hash FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }
        
        const isCurrentPasswordValid = await comparePassword(currentPassword, user[0].password_hash);
        
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Mevcut şifre hatalı'
            });
        }
        
        // Yeni şifreyi hash'le ve güncelle
        const newPasswordHash = await hashPassword(newPassword);
        
        await db.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [newPasswordHash, req.user.id]
        );
        
        res.json({
            success: true,
            message: 'Şifre başarıyla değiştirildi'
        });
        
    } catch (error) {
        console.error('Şifre değiştirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Şifre değiştirilirken hata oluştu'
        });
    }
});

// Admin: Tüm kullanıcıları listele
router.get('/admin/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.query(`
            SELECT id, first_name, last_name, username, email, role, is_active, last_login, created_at
            FROM users 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            data: users.map(user => ({
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                username: user.username,
                email: user.email,
                role: user.role,
                isActive: user.is_active,
                lastLogin: user.last_login,
                createdAt: user.created_at
            }))
        });
        
    } catch (error) {
        console.error('Kullanıcılar listeleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcılar listelenirken hata oluştu'
        });
    }
});

// Admin: Kullanıcı durumunu değiştir
router.put('/admin/users/:id/status', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        await db.query(
            'UPDATE users SET is_active = ? WHERE id = ?',
            [isActive, id]
        );
        
        res.json({
            success: true,
            message: `Kullanıcı ${isActive ? 'aktif' : 'pasif'} edildi`
        });
        
    } catch (error) {
        console.error('Kullanıcı durum değiştirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı durumu değiştirilirken hata oluştu'
        });
    }
});

// Admin: Kullanıcı rolünü değiştir
router.put('/admin/users/:id/role', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz rol'
            });
        }
        
        await db.query(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, id]
        );
        
        res.json({
            success: true,
            message: `Kullanıcı rolü ${role} olarak güncellendi`
        });
        
    } catch (error) {
        console.error('Kullanıcı rol değiştirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı rolü değiştirilirken hata oluştu'
        });
    }
});

module.exports = router;
