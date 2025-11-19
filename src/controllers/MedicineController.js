/**
 * İlaç Controller'ı
 * HTTP isteklerini karşılar ve MedicineService'i kullanır
 */
const express = require('express');
const router = express.Router();
const MedicineService = require('../services/MedicineService');
const CreateMedicineDTO = require('../dto/CreateMedicineDTO');
const UpdateMedicineDTO = require('../dto/UpdateMedicineDTO');
const { verifyToken } = require('../middleware/auth');

class MedicineController {
    constructor() {
        this.medicineService = new MedicineService();
        this.setupRoutes();
    }

    /**
     * Route'ları ayarlar
     */
    setupRoutes() {
        // Tüm ilaçları getir
        router.get('/', verifyToken, this.getAllMedicines.bind(this));
        
        // Barkod ile ilaç ara
        router.get('/barcode/:barcode', verifyToken, this.searchMedicineByBarcode.bind(this));
        
        // Detaylı ilaç bilgisi getir
        router.get('/detailed/:barcode', verifyToken, this.getDetailedMedicineInfo.bind(this));
        
        // İlaç API cache temizle
        router.post('/clear-cache', verifyToken, this.clearMedicineAPICache.bind(this));
        
        // Yeni ilaç ekle
        router.post('/', verifyToken, this.createMedicine.bind(this));
        
        // İlaç güncelle
        router.put('/:id', verifyToken, this.updateMedicine.bind(this));
        
        // İlaç sil
        router.delete('/:id', verifyToken, this.deleteMedicine.bind(this));
    }

    /**
     * Tüm ilaçları getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getAllMedicines(req, res) {
        try {
            const result = await this.medicineService.getAllMedicines(req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('İlaçları getirme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'İlaçlar getirilemedi'
            });
        }
    }

    /**
     * Barkod ile ilaç arar
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async searchMedicineByBarcode(req, res) {
        try {
            const { barcode } = req.params;
            const result = await this.medicineService.searchMedicineByBarcode(barcode, req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Barkod arama controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Barkod arama sırasında hata oluştu'
            });
        }
    }

    /**
     * Detaylı ilaç bilgisi getirir
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async getDetailedMedicineInfo(req, res) {
        try {
            const { barcode } = req.params;
            const result = await this.medicineService.getDetailedMedicineInfo(barcode);

            if (result.success) {
                res.json(result);
            } else {
                res.status(404).json(result);
            }
        } catch (error) {
            console.error('Detaylı ilaç bilgisi controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Detaylı ilaç bilgisi alınırken hata oluştu'
            });
        }
    }

    /**
     * İlaç API cache'ini temizler
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async clearMedicineAPICache(req, res) {
        try {
            const result = await this.medicineService.clearMedicineAPICache();

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error) {
            console.error('Cache temizleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'Cache temizlenirken hata oluştu'
            });
        }
    }

    /**
     * Yeni ilaç oluşturur
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async createMedicine(req, res) {
        try {
            const createMedicineDTO = new CreateMedicineDTO({
                ...req.body,
                userId: req.user.id
            });
            
            const result = await this.medicineService.createMedicine(createMedicineDTO);

            if (result.success) {
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('İlaç ekleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'İlaç eklenirken hata oluştu'
            });
        }
    }

    /**
     * İlaç bilgilerini günceller
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async updateMedicine(req, res) {
        try {
            const { id } = req.params;
            const updateMedicineDTO = new UpdateMedicineDTO(req.body);
            
            const result = await this.medicineService.updateMedicine(id, req.user.id, updateMedicineDTO);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('İlaç güncelleme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'İlaç güncellenirken hata oluştu'
            });
        }
    }

    /**
     * İlacı siler
     * @param {Object} req - Express request objesi
     * @param {Object} res - Express response objesi
     */
    async deleteMedicine(req, res) {
        try {
            const { id } = req.params;
            const result = await this.medicineService.deleteMedicine(id, req.user.id);

            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('İlaç silme controller hatası:', error);
            res.status(500).json({
                success: false,
                message: 'İlaç silinirken hata oluştu'
            });
        }
    }
}

// Controller instance'ını oluştur ve router'ı export et
const medicineController = new MedicineController();
module.exports = router;
