/**
 * Kimlik Doğrulama Controller'ı
 * HTTP isteklerini karşılar ve AuthService'i kullanır
 */
const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const CreateUserDTO = require('../dto/CreateUserDTO');
const UpdateUserDTO = require('../dto/UpdateUserDTO');
const { verifyToken, requireAdmin } = require('../middleware/auth');

class AuthController {
    constructor() {
        this.authService = new AuthService();
        this.setupRoutes();
    }

    /**
     * Route'ları ayarlar
     */
    setupRoutes() {
        // Kullanıcı kayıt
        router.post('/register', this.register.bind(this));
        
        // Kullanıcı giriş
        router.post('/login', this.login.bind(this));
        
        // Kullanıcı profili getir
        router.get('/profile', verifyToken, this.getProfile.bind(this));
        
        // Kullanıcı profili güncelle
        router.put('/profile', verifyToken, this.updateProfile.bind(this));
        
        // Şifre değiştir
        router.put('/change-password', verifyToken, this.changePassword.bind(this));
        
        // Admin: Tüm kullanıcıları listele
        router.get('/admin/users', verifyToken, requireAdmin, this.getAllUsers.bind(this));
        
        // Admin: Kullanıcı durumunu değiştir
        router.put('/admin/users/:id/status', verifyToken, requireAdmin, this.changeUserStatus.bind(this));
        
        // Admin: Kullanıcı rolünü değiştir
        router.put('/admin/users/:id/role', verifyToken, requireAdmin, this.changeUserRole.bind(this));
    }

    /**
     * Kullanıcı kaydı oluşturur
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async register(req, res) {
        try {
            const createUserDTO = new CreateUserDTO(req.body);
            const result = await this.authService.register(createUserDTO);

            if (result.success) {
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Kullanıcı kayıt controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Kullanıcı kaydedilirken hata oluştu'
            });
        }
    }

    /**
     * Kullanıcı girişi yapar
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async login(req, res) {
        try {
            const { username, password } = req.body;
            const result = await this.authService.login(username, password);

            if (result.success) {
                res.json(result);
            } else {
                res.status(401).json(result);
            }
        } catch (error) {
            console.error('Kullanıcı giriş controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Giriş yapılırken hata oluştu'
            });
        }
    }

    /**
     * Kullanıcı profilini getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getProfile(req, res) {
        try {
            const result = await this.authService.getProfile(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Profil getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Profil bilgileri getirilemedi'
            });
        }
    }

    /**
     * Kullanıcı profilini günceller
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async updateProfile(req, res) {
        try {
            const updateUserDTO = new UpdateUserDTO(req.body);
            const result = await this.authService.updateProfile(req.user.id, updateUserDTO);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Profil güncelleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Profil güncellenirken hata oluştu'
            });
        }
    }

    /**
     * Kullanıcı şifresini değiştirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const result = await this.authService.changePassword(req.user.id, currentPassword, newPassword);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Şifre değiştirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Şifre değiştirilirken hata oluştu'
            });
        }
    }

    /**
     * Tüm kullanıcıları listeler (Admin)
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getAllUsers(req, res) {
        try {
            const result = await this.authService.getAllUsers();

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Kullanıcılar listeleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Kullanıcılar listelenirken hata oluştu'
            });
        }
    }

    /**
     * Kullanıcı durumunu değiştirir (Admin)
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async changeUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            const result = await this.authService.changeUserStatus(id, isActive);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Kullanıcı durum değiştirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Kullanıcı durumu değiştirilirken hata oluştu'
            });
        }
    }

    /**
     * Kullanıcı rolünü değiştirir (Admin)
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async changeUserRole(req, res) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            const result = await this.authService.changeUserRole(id, role);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Kullanıcı rol değiştirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Kullanıcı rolü değiştirilirken hata oluştu'
            });
        }
    }
}

// Controller instance'ını oluştur ve router'ı export et
const authController = new AuthController();
module.exports = router;
