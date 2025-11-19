/**
 * İlaç Stoku Güncelleme DTO Sınıfı
 * Stok bilgilerini güncelleme için request veri transfer objesi
 */
class UpdateStockDTO {
    /**
     * Stok güncelleme DTO'sunu oluşturur
     * @param {Object} data - Stok güncelleme verileri
     */
    constructor(data = {}) {
        this.quantity = data.quantity !== undefined ? data.quantity : null;
        this.purchaseDate = data.purchaseDate || data.purchase_date || null;
        this.expiryDate = data.expiryDate || data.expiry_date || null;
        this.purchasePrice = data.purchasePrice !== undefined ? data.purchasePrice : null;
        this.location = data.location !== undefined ? data.location : null;
        this.notes = data.notes !== undefined ? data.notes : null;
    }

    /**
     * DTO'yu MedicineStockEntity'ye dönüştürür
     * @returns {MedicineStockEntity} MedicineStockEntity objesi
     */
    toEntity() {
        const MedicineStockEntity = require('../entities/MedicineStockEntity');
        return new MedicineStockEntity({
            quantity: this.quantity,
            purchase_date: this.purchaseDate,
            expiry_date: this.expiryDate,
            purchase_price: this.purchasePrice,
            location: this.location,
            notes: this.notes
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        const result = {};
        
        if (this.quantity !== null) result.quantity = this.quantity;
        if (this.purchaseDate !== null) result.purchaseDate = this.purchaseDate;
        if (this.expiryDate !== null) result.expiryDate = this.expiryDate;
        if (this.purchasePrice !== null) result.purchasePrice = this.purchasePrice;
        if (this.location !== null) result.location = this.location;
        if (this.notes !== null) result.notes = this.notes;
        
        return result;
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (this.quantity !== null) {
            if (!Number.isInteger(this.quantity) || this.quantity < 0) {
                errors.push('Miktar pozitif bir tam sayı olmalıdır');
            } else if (this.quantity > 999999) {
                errors.push('Miktar çok büyük (maksimum 999,999)');
            }
        }

        if (this.purchaseDate !== null) {
            if (!this.isValidDate(this.purchaseDate)) {
                errors.push('Geçersiz satın alma tarihi formatı');
            } else if (this.isFutureDate(this.purchaseDate)) {
                errors.push('Satın alma tarihi gelecek bir tarih olamaz');
            }
        }

        if (this.expiryDate !== null) {
            if (!this.isValidDate(this.expiryDate)) {
                errors.push('Geçersiz son kullanım tarihi formatı');
            } else if (this.isPastDate(this.expiryDate)) {
                errors.push('Son kullanım tarihi geçmiş bir tarih olamaz');
            }
        }

        if (this.purchasePrice !== null) {
            if (!Number.isFinite(this.purchasePrice) || this.purchasePrice < 0) {
                errors.push('Satın alma fiyatı geçerli bir sayı olmalıdır');
            } else if (this.purchasePrice > 999999.99) {
                errors.push('Satın alma fiyatı çok büyük (maksimum 999,999.99)');
            }
        }

        if (this.location !== null) {
            if (this.location.trim().length === 0) {
                errors.push('Konum bilgisi boş olamaz');
            } else if (this.location.trim().length > 255) {
                errors.push('Konum bilgisi çok uzun (maksimum 255 karakter)');
            }
        }

        if (this.notes !== null) {
            if (this.notes.trim().length > 1000) {
                errors.push('Notlar çok uzun (maksimum 1000 karakter)');
            }
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
     * Güncellenecek alanların listesini döndürür
     * @returns {Array} Güncellenecek alanlar
     */
    getUpdateFields() {
        const fields = [];
        
        if (this.quantity !== null) fields.push('quantity');
        if (this.purchaseDate !== null) fields.push('purchaseDate');
        if (this.expiryDate !== null) fields.push('expiryDate');
        if (this.purchasePrice !== null) fields.push('purchasePrice');
        if (this.location !== null) fields.push('location');
        if (this.notes !== null) fields.push('notes');
        
        return fields;
    }

    /**
     * Güncelleme yapılıp yapılmayacağını kontrol eder
     * @returns {boolean} Güncelleme yapılacaksa true
     */
    hasUpdates() {
        return this.getUpdateFields().length > 0;
    }

    /**
     * Veritabanı güncelleme formatına dönüştürür
     * @returns {Object} Veritabanı güncelleme objesi
     */
    toDatabaseUpdateFormat() {
        const updateData = {};
        
        if (this.quantity !== null) updateData.quantity = this.quantity;
        if (this.purchaseDate !== null) updateData.purchase_date = this.purchaseDate;
        if (this.expiryDate !== null) updateData.expiry_date = this.expiryDate;
        if (this.purchasePrice !== null) updateData.purchase_price = this.purchasePrice;
        if (this.location !== null) updateData.location = this.location;
        if (this.notes !== null) updateData.notes = this.notes;
        
        return updateData;
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
     * Stok için güncellenmiş kısa açıklama oluşturur
     * @returns {string} Kısa açıklama
     */
    getShortDescription() {
        if (this.quantity !== null && this.expiryDate !== null) {
            return `${this.quantity} adet - Son kullanım: ${this.expiryDate}`;
        } else if (this.quantity !== null) {
            return `${this.quantity} adet`;
        } else if (this.expiryDate !== null) {
            return `Son kullanım: ${this.expiryDate}`;
        }
        return 'Güncellenmiş stok';
    }
}

module.exports = UpdateStockDTO;
