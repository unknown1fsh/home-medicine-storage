/**
 * İlaç Oluşturma DTO Sınıfı
 * Yeni ilaç kaydı için request veri transfer objesi
 */
class CreateMedicineDTO {
    /**
     * İlaç oluşturma DTO'sunu oluşturur
     * @param {Object} data - İlaç oluşturma verileri
     */
    constructor(data = {}) {
        this.barcode = data.barcode || null;
        this.name = data.name || null;
        this.activeIngredient = data.activeIngredient || data.active_ingredient || null;
        this.manufacturer = data.manufacturer || null;
        this.dosageForm = data.dosageForm || data.dosage_form || null;
        this.strength = data.strength || null;
        this.packageSize = data.packageSize || data.package_size || null;
        this.description = data.description || null;
        this.userId = data.userId || data.user_id || null;
    }

    /**
     * DTO'yu MedicineEntity'ye dönüştürür
     * @returns {MedicineEntity} MedicineEntity objesi
     */
    toEntity() {
        const MedicineEntity = require('../entities/MedicineEntity');
        return new MedicineEntity({
            barcode: this.barcode,
            name: this.name,
            active_ingredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            dosage_form: this.dosageForm,
            strength: this.strength,
            package_size: this.packageSize,
            description: this.description,
            user_id: this.userId
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        return {
            barcode: this.barcode,
            name: this.name,
            activeIngredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            dosageForm: this.dosageForm,
            strength: this.strength,
            packageSize: this.packageSize,
            description: this.description,
            userId: this.userId
        };
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (!this.barcode || this.barcode.trim().length === 0) {
            errors.push('Barkod zorunludur');
        } else if (this.barcode.length < 8) {
            errors.push('Barkod en az 8 karakter olmalıdır');
        } else if (!this.isValidBarcode(this.barcode)) {
            errors.push('Geçersiz barkod formatı');
        }

        if (!this.name || this.name.trim().length === 0) {
            errors.push('İlaç adı zorunludur');
        } else if (this.name.trim().length < 2) {
            errors.push('İlaç adı en az 2 karakter olmalıdır');
        }

        if (this.activeIngredient && this.activeIngredient.trim().length < 2) {
            errors.push('Etken madde en az 2 karakter olmalıdır');
        }

        if (this.manufacturer && this.manufacturer.trim().length < 2) {
            errors.push('Üretici firma en az 2 karakter olmalıdır');
        }

        if (this.dosageForm && this.dosageForm.trim().length < 2) {
            errors.push('Dozaj formu en az 2 karakter olmalıdır');
        }

        if (this.strength && this.strength.trim().length < 1) {
            errors.push('Güç bilgisi en az 1 karakter olmalıdır');
        }

        if (this.packageSize && this.packageSize.trim().length < 1) {
            errors.push('Paket boyutu en az 1 karakter olmalıdır');
        }

        if (this.description && this.description.trim().length < 5) {
            errors.push('Açıklama en az 5 karakter olmalıdır');
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
     * Barkod formatını kontrol eder
     * @param {string} barcode - Barkod
     * @returns {boolean} Geçerli ise true
     */
    isValidBarcode(barcode) {
        // Barkod sadece rakam ve harf içerebilir
        const barcodeRegex = /^[A-Za-z0-9]+$/;
        return barcodeRegex.test(barcode);
    }

    /**
     * Barkod türünü tespit eder
     * @returns {string} Barkod türü
     */
    getBarcodeType() {
        if (!this.barcode) return 'unknown';
        
        const cleaned = this.barcode.replace(/[^0-9]/g, '');
        
        if (cleaned.length === 8) return 'ean8';
        if (cleaned.length === 12) return 'upc';
        if (cleaned.length === 13) return 'ean13';
        if (cleaned.length === 14) return 'gtin14';
        
        return 'unknown';
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
     * Veritabanı kayıt formatına dönüştürür
     * @returns {Object} Veritabanı kayıt objesi
     */
    toDatabaseFormat() {
        return {
            barcode: this.barcode,
            name: this.name,
            active_ingredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            dosage_form: this.dosageForm,
            strength: this.strength,
            package_size: this.packageSize,
            description: this.description,
            user_id: this.userId
        };
    }
}

module.exports = CreateMedicineDTO;
