/**
 * İlaç Stoku Controller'ı
 * HTTP isteklerini karşılar ve StockService'i kullanır
 */
const express = require('express');
const router = express.Router();
const StockService = require('../services/StockService');
const CreateStockDTO = require('../dto/CreateStockDTO');
const UpdateStockDTO = require('../dto/UpdateStockDTO');
const { verifyToken } = require('../middleware/auth');

class StockController {
    constructor() {
        this.stockService = new StockService();
        this.setupRoutes();
    }

    /**
     * Route'ları ayarlar
     */
    setupRoutes() {
        // Tüm stokları getir
        router.get('/', verifyToken, this.getAllStocks.bind(this));
        
        // Belirli bir ilacın stoklarını getir
        router.get('/medicine/:medicineId', verifyToken, this.getStocksByMedicineId.bind(this));
        
        // Yaklaşan son kullanım tarihleri
        router.get('/expiring/:days', verifyToken, this.getExpiringStocks.bind(this));
        
        // Yeni stok ekle
        router.post('/', verifyToken, this.createStock.bind(this));
        
        // Stok güncelle
        router.put('/:id', verifyToken, this.updateStock.bind(this));
        
        // Stok sil
        router.delete('/:id', verifyToken, this.deleteStock.bind(this));
    }

    /**
     * Tüm stokları getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getAllStocks(req, res) {
        try {
            const result = await this.stockService.getAllStocks(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Stokları getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Stoklar getirilemedi'
            });
        }
    }

    /**
     * Belirli bir ilacın stoklarını getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getStocksByMedicineId(req, res) {
        try {
            const { medicineId } = req.params;
            const result = await this.stockService.getStocksByMedicineId(medicineId, req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('İlaç stokları getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'İlaç stokları getirilemedi'
            });
        }
    }

    /**
     * Yaklaşan son kullanım tarihli stokları getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getExpiringStocks(req, res) {
        try {
            const { days } = req.params;
            const daysInt = parseInt(days);
            
            const result = await this.stockService.getExpiringStocks(req.user.id, daysInt);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Yaklaşan son kullanım tarihli stokları getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Yaklaşan son kullanım tarihli stoklar getirilemedi'
            });
        }
    }

    /**
     * Yeni stok oluşturur
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async createStock(req, res) {
        try {
            const createStockDTO = new CreateStockDTO({
                ...req.body,
                userId: req.user.id
            });
            
            const result = await this.stockService.createStock(createStockDTO);

            if (result.success) {
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Stok ekleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Stok eklenirken hata oluştu'
            });
        }
    }

    /**
     * Stok bilgilerini günceller
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async updateStock(req, res) {
        try {
            const { id } = req.params;
            const updateStockDTO = new UpdateStockDTO(req.body);
            
            const result = await this.stockService.updateStock(id, req.user.id, updateStockDTO);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Stok güncelleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Stok güncellenirken hata oluştu'
            });
        }
    }

    /**
     * Stoku siler
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async deleteStock(req, res) {
        try {
            const { id } = req.params;
            const result = await this.stockService.deleteStock(id, req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Stok silme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Stok silinirken hata oluştu'
            });
        }
    }
}

// Controller instance'ını oluştur ve router'ı export et
const stockController = new StockController();
module.exports = router;
