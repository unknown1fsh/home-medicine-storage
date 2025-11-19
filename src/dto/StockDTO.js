/**
 * İlaç Stoku DTO Sınıfı
 * API response'ları için stok veri transfer objesi
 */
class StockDTO {
    /**
     * Stok DTO'sunu oluşturur
     * @param {Object} data - Stok verileri
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.medicineId = data.medicineId || data.medicine_id || null;
        this.quantity = data.quantity || 0;
        this.purchaseDate = data.purchaseDate || data.purchase_date || null;
        this.expiryDate = data.expiryDate || data.expiry_date || null;
        this.purchasePrice = data.purchasePrice || data.purchase_price || null;
        this.location = data.location || null;
        this.notes = data.notes || null;
        this.userId = data.userId || data.user_id || null;
        this.createdAt = data.createdAt || data.created_at || null;
        this.updatedAt = data.updatedAt || data.updated_at || null;
        
        // İlişkili veriler
        this.medicineName = data.medicineName || data.medicine_name || null;
        this.barcode = data.barcode || null;
        this.activeIngredient = data.activeIngredient || data.active_ingredient || null;
        this.manufacturer = data.manufacturer || null;
        
        // Hesaplanan alanlar
        this.daysUntilExpiry = data.daysUntilExpiry || data.days_until_expiry || null;
        this.status = data.status || null;
    }

    /**
     * DTO'yu MedicineStockEntity'ye dönüştürür
     * @returns {MedicineStockEntity} MedicineStockEntity objesi
     */
    toEntity() {
        const MedicineStockEntity = require('../entities/MedicineStockEntity');
        return new MedicineStockEntity({
            id: this.id,
            medicine_id: this.medicineId,
            quantity: this.quantity,
            purchase_date: this.purchaseDate,
            expiry_date: this.expiryDate,
            purchase_price: this.purchasePrice,
            location: this.location,
            notes: this.notes,
            user_id: this.userId,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            medicine_name: this.medicineName,
            barcode: this.barcode,
            active_ingredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            days_until_expiry: this.daysUntilExpiry,
            status: this.status
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        return {
            id: this.id,
            medicineId: this.medicineId,
            quantity: this.quantity,
            purchaseDate: this.purchaseDate,
            expiryDate: this.expiryDate,
            purchasePrice: this.purchasePrice,
            location: this.location,
            notes: this.notes,
            userId: this.userId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            medicineName: this.medicineName,
            barcode: this.barcode,
            activeIngredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            daysUntilExpiry: this.daysUntilExpiry,
            status: this.status
        };
    }

    /**
     * Stok durumunu hesaplar ve günceller
     * @returns {string} Stok durumu
     */
    calculateStatus() {
        if (!this.expiryDate) {
            this.status = 'unknown';
            return this.status;
        }

        const expiryDate = new Date(this.expiryDate);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        this.daysUntilExpiry = diffDays;

        if (diffDays < 0) {
            this.status = 'expired';
        } else if (diffDays <= 7) {
            this.status = 'critical';
        } else if (diffDays <= 30) {
            this.status = 'warning';
        } else {
            this.status = 'good';
        }

        return this.status;
    }

    /**
     * Stokun süresi geçmiş mi kontrol eder
     * @returns {boolean} Süresi geçmiş ise true
     */
    isExpired() {
        if (!this.expiryDate) return false;
        
        const expiryDate = new Date(this.expiryDate);
        const today = new Date();
        return expiryDate < today;
    }

    /**
     * Stokun kritik durumda mı kontrol eder (7 gün veya daha az)
     * @returns {boolean} Kritik durumda ise true
     */
    isCritical() {
        if (!this.expiryDate) return false;
        
        const expiryDate = new Date(this.expiryDate);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 7 && diffDays >= 0;
    }

    /**
     * Stokun uyarı durumunda mı kontrol eder (30 gün veya daha az)
     * @returns {boolean} Uyarı durumunda ise true
     */
    isWarning() {
        if (!this.expiryDate) return false;
        
        const expiryDate = new Date(this.expiryDate);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= 30 && diffDays > 7;
    }

    /**
     * Stok miktarının yeterli olup olmadığını kontrol eder
     * @param {number} minQuantity - Minimum miktar (varsayılan: 1)
     * @returns {boolean} Yeterli ise true
     */
    hasEnoughQuantity(minQuantity = 1) {
        return this.quantity >= minQuantity;
    }

    /**
     * Stok için tam açıklama oluşturur
     * @returns {string} Tam açıklama
     */
    getFullDescription() {
        const parts = [];
        if (this.medicineName) parts.push(this.medicineName);
        if (this.quantity) parts.push(`Miktar: ${this.quantity}`);
        if (this.expiryDate) {
            const status = this.calculateStatus();
            parts.push(`Son kullanım: ${this.expiryDate} (${status})`);
        }
        if (this.location) parts.push(`Konum: ${this.location}`);
        
        return parts.join(' | ');
    }

    /**
     * Stok için kısa açıklama oluşturur
     * @returns {string} Kısa açıklama
     */
    getShortDescription() {
        if (this.medicineName && this.quantity) {
            return `${this.medicineName} - ${this.quantity} adet`;
        }
        return this.medicineName || 'Bilinmeyen Stok';
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (!this.medicineId || !Number.isInteger(this.medicineId) || this.medicineId <= 0) {
            errors.push('Geçersiz ilaç ID\'si');
        }

        if (this.quantity === null || this.quantity === undefined || !Number.isInteger(this.quantity) || this.quantity < 0) {
            errors.push('Geçersiz miktar');
        }

        if (!this.expiryDate) {
            errors.push('Son kullanım tarihi zorunludur');
        } else if (!this.isValidDate(this.expiryDate)) {
            errors.push('Geçersiz son kullanım tarihi');
        }

        if (this.purchaseDate && !this.isValidDate(this.purchaseDate)) {
            errors.push('Geçersiz satın alma tarihi');
        }

        if (this.purchasePrice && (!Number.isFinite(this.purchasePrice) || this.purchasePrice < 0)) {
            errors.push('Geçersiz satın alma fiyatı');
        }

        if (this.userId && (!Number.isInteger(this.userId) || this.userId <= 0)) {
            errors.push('Geçersiz kullanıcı ID\'si');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Tarih formatını kontrol eder
     * @param {string} date - Tarih string'i
     * @returns {boolean} Geçerli ise true
     */
    isValidDate(date) {
        const dateObj = new Date(date);
        return dateObj instanceof Date && !isNaN(dateObj);
    }
}

module.exports = StockDTO;
