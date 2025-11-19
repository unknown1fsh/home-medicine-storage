/**
 * İlaç Stoku Oluşturma DTO Sınıfı
 * Yeni stok kaydı için request veri transfer objesi
 */
class CreateStockDTO {
    /**
     * Stok oluşturma DTO'sunu oluşturur
     * @param {Object} data - Stok oluşturma verileri
     */
    constructor(data = {}) {
        this.medicineId = data.medicineId || data.medicine_id || null;
        this.quantity = data.quantity || null;
        this.purchaseDate = data.purchaseDate || data.purchase_date || null;
        this.expiryDate = data.expiryDate || data.expiry_date || null;
        this.purchasePrice = data.purchasePrice || data.purchase_price || null;
        this.location = data.location || null;
        this.notes = data.notes || null;
        this.userId = data.userId || data.user_id || null;
    }

    /**
     * DTO'yu MedicineStockEntity'ye dönüştürür
     * @returns {MedicineStockEntity} MedicineStockEntity objesi
     */
    toEntity() {
        const MedicineStockEntity = require('../entities/MedicineStockEntity');
        return new MedicineStockEntity({
            medicine_id: this.medicineId,
            quantity: this.quantity,
            purchase_date: this.purchaseDate,
            expiry_date: this.expiryDate,
            purchase_price: this.purchasePrice,
            location: this.location,
            notes: this.notes,
            user_id: this.userId
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        return {
            medicineId: this.medicineId,
            quantity: this.quantity,
            purchaseDate: this.purchaseDate,
            expiryDate: this.expiryDate,
            purchasePrice: this.purchasePrice,
            location: this.location,
            notes: this.notes,
            userId: this.userId
        };
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

        if (this.quantity === null || this.quantity === undefined) {
            errors.push('Miktar zorunludur');
        } else if (!Number.isInteger(this.quantity) || this.quantity <= 0) {
            errors.push('Miktar pozitif bir tam sayı olmalıdır');
        } else if (this.quantity > 999999) {
            errors.push('Miktar çok büyük (maksimum 999,999)');
        }

        if (!this.expiryDate) {
            errors.push('Son kullanım tarihi zorunludur');
        } else if (!this.isValidDate(this.expiryDate)) {
            errors.push('Geçersiz son kullanım tarihi formatı');
        } else if (this.isPastDate(this.expiryDate)) {
            errors.push('Son kullanım tarihi geçmiş bir tarih olamaz');
        }

        if (this.purchaseDate && !this.isValidDate(this.purchaseDate)) {
            errors.push('Geçersiz satın alma tarihi formatı');
        } else if (this.purchaseDate && this.isFutureDate(this.purchaseDate)) {
            errors.push('Satın alma tarihi gelecek bir tarih olamaz');
        }

        if (this.purchasePrice !== null && this.purchasePrice !== undefined) {
            if (!Number.isFinite(this.purchasePrice) || this.purchasePrice < 0) {
                errors.push('Satın alma fiyatı geçerli bir sayı olmalıdır');
            } else if (this.purchasePrice > 999999.99) {
                errors.push('Satın alma fiyatı çok büyük (maksimum 999,999.99)');
            }
        }

        if (this.location && this.location.trim().length > 255) {
            errors.push('Konum bilgisi çok uzun (maksimum 255 karakter)');
        }

        if (this.notes && this.notes.trim().length > 1000) {
            errors.push('Notlar çok uzun (maksimum 1000 karakter)');
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

    /**
     * Geçmiş tarih kontrolü yapar
     * @param {string} date - Tarih string'i
     * @returns {boolean} Geçmiş tarih ise true
     */
    isPastDate(date) {
        const dateObj = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dateObj < today;
    }

    /**
     * Gelecek tarih kontrolü yapar
     * @param {string} date - Tarih string'i
     * @returns {boolean} Gelecek tarih ise true
     */
    isFutureDate(date) {
        const dateObj = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return dateObj > today;
    }

    /**
     * Satın alma ve son kullanım tarihi tutarlılığını kontrol eder
     * @returns {Object} Tutarlılık kontrolü sonucu
     */
    validateDateConsistency() {
        const errors = [];

        if (this.purchaseDate && this.expiryDate) {
            const purchaseDate = new Date(this.purchaseDate);
            const expiryDate = new Date(this.expiryDate);

            if (purchaseDate > expiryDate) {
                errors.push('Satın alma tarihi son kullanım tarihinden sonra olamaz');
            }

            // Son kullanım tarihi satın alma tarihinden en az 1 gün sonra olmalı
            const diffTime = expiryDate - purchaseDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 1) {
                errors.push('Son kullanım tarihi satın alma tarihinden en az 1 gün sonra olmalıdır');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Veritabanı kayıt formatına dönüştürür
     * @returns {Object} Veritabanı kayıt objesi
     */
    toDatabaseFormat() {
        return {
            medicine_id: this.medicineId,
            quantity: this.quantity,
            purchase_date: this.purchaseDate,
            expiry_date: this.expiryDate,
            purchase_price: this.purchasePrice,
            location: this.location,
            notes: this.notes,
            user_id: this.userId
        };
    }

    /**
     * Stok için kısa açıklama oluşturur
     * @returns {string} Kısa açıklama
     */
    getShortDescription() {
        if (this.quantity && this.expiryDate) {
            return `${this.quantity} adet - Son kullanım: ${this.expiryDate}`;
        }
        return `${this.quantity || 0} adet`;
    }
}

module.exports = CreateStockDTO;
