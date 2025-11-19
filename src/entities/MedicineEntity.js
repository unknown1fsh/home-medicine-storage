/**
 * İlaç Entity Sınıfı
 * Veritabanındaki medicines tablosunu temsil eder
 */
class MedicineEntity {
    /**
     * İlaç entity'sini oluşturur
     * @param {Object} data - İlaç verileri
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.barcode = data.barcode || null;
        this.name = data.name || null;
        this.activeIngredient = data.active_ingredient || data.activeIngredient || null;
        this.manufacturer = data.manufacturer || null;
        this.dosageForm = data.dosage_form || data.dosageForm || null;
        this.strength = data.strength || null;
        this.packageSize = data.package_size || data.packageSize || null;
        this.description = data.description || null;
        this.userId = data.user_id || data.userId || null;
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
        
        // İlişkili veriler (JOIN sonuçları için)
        this.stockCount = data.stock_count || null;
        this.nearestExpiry = data.nearest_expiry || null;
    }

    /**
     * Entity'yi MedicineDTO'ya dönüştürür
     * @returns {Object} MedicineDTO objesi
     */
    toDTO() {
        return {
            id: this.id,
            barcode: this.barcode,
            name: this.name,
            activeIngredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            dosageForm: this.dosageForm,
            strength: this.strength,
            packageSize: this.packageSize,
            description: this.description,
            userId: this.userId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            stockCount: this.stockCount,
            nearestExpiry: this.nearestExpiry
        };
    }

    /**
     * Entity'yi veritabanı formatına dönüştürür
     * @returns {Object} Veritabanı formatında ilaç verisi
     */
    toDatabaseFormat() {
        return {
            id: this.id,
            barcode: this.barcode,
            name: this.name,
            active_ingredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            dosage_form: this.dosageForm,
            strength: this.strength,
            package_size: this.packageSize,
            description: this.description,
            user_id: this.userId,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }

    /**
     * İlaç için tam açıklama oluşturur
     * @returns {string} Tam açıklama
     */
    getFullDescription() {
        const parts = [];
        if (this.name) parts.push(this.name);
        if (this.strength) parts.push(`(${this.strength})`);
        if (this.dosageForm) parts.push(`- ${this.dosageForm}`);
        if (this.manufacturer) parts.push(`- ${this.manufacturer}`);
        
        return parts.join(' ');
    }

    /**
     * İlaç için kısa açıklama oluşturur
     * @returns {string} Kısa açıklama
     */
    getShortDescription() {
        if (this.name && this.strength) {
            return `${this.name} (${this.strength})`;
        }
        return this.name || 'Bilinmeyen İlaç';
    }

    /**
     * Barkodun geçerli olup olmadığını kontrol eder
     * @returns {boolean} Geçerli ise true
     */
    hasValidBarcode() {
        return this.barcode && this.barcode.length >= 8;
    }

    /**
     * İlacın stok durumunu kontrol eder
     * @returns {string} Stok durumu
     */
    getStockStatus() {
        if (this.stockCount === null || this.stockCount === undefined) {
            return 'unknown';
        }
        if (this.stockCount === 0) {
            return 'out_of_stock';
        }
        if (this.stockCount <= 5) {
            return 'low_stock';
        }
        return 'in_stock';
    }

    /**
     * İlacın yaklaşan son kullanım tarihi var mı kontrol eder
     * @param {number} days - Kaç gün içinde (varsayılan: 30)
     * @returns {boolean} Yaklaşan tarih var ise true
     */
    hasNearExpiry(days = 30) {
        if (!this.nearestExpiry) return false;
        
        const expiryDate = new Date(this.nearestExpiry);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays <= days && diffDays >= 0;
    }
}

module.exports = MedicineEntity;
