/**
 * Son Kullanım Tarihi Uyarısı Controller'ı
 * HTTP isteklerini karşılar ve AlertService'i kullanır
 */
const express = require('express');
const router = express.Router();
const AlertService = require('../services/AlertService');
const { verifyToken } = require('../middleware/auth');

class AlertController {
    constructor() {
        this.alertService = new AlertService();
        this.setupRoutes();
    }

    /**
     * Route'ları ayarlar
     */
    setupRoutes() {
        // Tüm uyarıları getir
        router.get('/', verifyToken, this.getAllAlerts.bind(this));
        
        // Okunmamış uyarıları getir
        router.get('/unread', verifyToken, this.getUnreadAlerts.bind(this));
        
        // Uyarıyı okundu olarak işaretle
        router.put('/:id/read', verifyToken, this.markAlertAsRead.bind(this));
        
        // Tüm uyarıları okundu olarak işaretle
        router.put('/read-all', verifyToken, this.markAllAlertsAsRead.bind(this));
        
        // Uyarı sil
        router.delete('/:id', verifyToken, this.deleteAlert.bind(this));
        
        // Son kullanım tarihi uyarılarını kontrol et ve oluştur
        router.post('/check-expiry', verifyToken, this.checkAndCreateExpiryAlerts.bind(this));
        
        // Uyarı istatistikleri
        router.get('/stats', verifyToken, this.getAlertStatistics.bind(this));
    }

    /**
     * Tüm uyarıları getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getAllAlerts(req, res) {
        try {
            const result = await this.alertService.getAllAlerts(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Uyarıları getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Uyarılar getirilemedi'
            });
        }
    }

    /**
     * Okunmamış uyarıları getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getUnreadAlerts(req, res) {
        try {
            const result = await this.alertService.getUnreadAlerts(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Okunmamış uyarıları getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Okunmamış uyarılar getirilemedi'
            });
        }
    }

    /**
     * Uyarıyı okundu olarak işaretler
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async markAlertAsRead(req, res) {
        try {
            const { id } = req.params;
            const result = await this.alertService.markAlertAsRead(id, req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Uyarı okundu işaretleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Uyarı okundu olarak işaretlenirken hata oluştu'
            });
        }
    }

    /**
     * Tüm uyarıları okundu olarak işaretler
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async markAllAlertsAsRead(req, res) {
        try {
            const result = await this.alertService.markAllAlertsAsRead(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Tüm uyarıları okundu işaretleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Tüm uyarılar okundu olarak işaretlenirken hata oluştu'
            });
        }
    }

    /**
     * Uyarıyı siler
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async deleteAlert(req, res) {
        try {
            const { id } = req.params;
            const result = await this.alertService.deleteAlert(id, req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Uyarı silme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Uyarı silinirken hata oluştu'
            });
        }
    }

    /**
     * Son kullanım tarihi uyarılarını kontrol eder ve oluşturur
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async checkAndCreateExpiryAlerts(req, res) {
        try {
            const result = await this.alertService.checkAndCreateExpiryAlerts(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Son kullanım tarihi kontrol controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Son kullanım tarihi kontrol edilirken hata oluştu'
            });
        }
    }

    /**
     * Uyarı istatistiklerini getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getAlertStatistics(req, res) {
        try {
            const result = await this.alertService.getAlertStatistics(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Uyarı istatistikleri getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Uyarı istatistikleri getirilemedi'
            });
        }
    }
}

// Controller instance'ını oluştur ve router'ı export et
const alertController = new AlertController();
module.exports = router;
