/**
 * İlaç Güncelleme DTO Sınıfı
 * İlaç bilgilerini güncelleme için request veri transfer objesi
 */
class UpdateMedicineDTO {
    /**
     * İlaç güncelleme DTO'sunu oluşturur
     * @param {Object} data - İlaç güncelleme verileri
     */
    constructor(data = {}) {
        this.name = data.name || null;
        this.activeIngredient = data.activeIngredient || data.active_ingredient || null;
        this.manufacturer = data.manufacturer || null;
        this.dosageForm = data.dosageForm || data.dosage_form || null;
        this.strength = data.strength || null;
        this.packageSize = data.packageSize || data.package_size || null;
        this.description = data.description || null;
    }

    /**
     * DTO'yu MedicineEntity'ye dönüştürür
     * @returns {MedicineEntity} MedicineEntity objesi
     */
    toEntity() {
        const MedicineEntity = require('../entities/MedicineEntity');
        return new MedicineEntity({
            name: this.name,
            active_ingredient: this.activeIngredient,
            manufacturer: this.manufacturer,
            dosage_form: this.dosageForm,
            strength: this.strength,
            package_size: this.packageSize,
            description: this.description
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        const result = {};
        
        if (this.name !== null) result.name = this.name;
        if (this.activeIngredient !== null) result.activeIngredient = this.activeIngredient;
        if (this.manufacturer !== null) result.manufacturer = this.manufacturer;
        if (this.dosageForm !== null) result.dosageForm = this.dosageForm;
        if (this.strength !== null) result.strength = this.strength;
        if (this.packageSize !== null) result.packageSize = this.packageSize;
        if (this.description !== null) result.description = this.description;
        
        return result;
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (this.name !== null) {
            if (this.name.trim().length === 0) {
                errors.push('İlaç adı boş olamaz');
            } else if (this.name.trim().length < 2) {
                errors.push('İlaç adı en az 2 karakter olmalıdır');
            }
        }

        if (this.activeIngredient !== null) {
            if (this.activeIngredient.trim().length === 0) {
                errors.push('Etken madde boş olamaz');
            } else if (this.activeIngredient.trim().length < 2) {
                errors.push('Etken madde en az 2 karakter olmalıdır');
            }
        }

        if (this.manufacturer !== null) {
            if (this.manufacturer.trim().length === 0) {
                errors.push('Üretici firma boş olamaz');
            } else if (this.manufacturer.trim().length < 2) {
                errors.push('Üretici firma en az 2 karakter olmalıdır');
            }
        }

        if (this.dosageForm !== null) {
            if (this.dosageForm.trim().length === 0) {
                errors.push('Dozaj formu boş olamaz');
            } else if (this.dosageForm.trim().length < 2) {
                errors.push('Dozaj formu en az 2 karakter olmalıdır');
            }
        }

        if (this.strength !== null) {
            if (this.strength.trim().length === 0) {
                errors.push('Güç bilgisi boş olamaz');
            } else if (this.strength.trim().length < 1) {
                errors.push('Güç bilgisi en az 1 karakter olmalıdır');
            }
        }

        if (this.packageSize !== null) {
            if (this.packageSize.trim().length === 0) {
                errors.push('Paket boyutu boş olamaz');
            } else if (this.packageSize.trim().length < 1) {
                errors.push('Paket boyutu en az 1 karakter olmalıdır');
            }
        }

        if (this.description !== null) {
            if (this.description.trim().length === 0) {
                errors.push('Açıklama boş olamaz');
            } else if (this.description.trim().length < 5) {
                errors.push('Açıklama en az 5 karakter olmalıdır');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Güncellenecek alanların listesini döndürür
     * @returns {Array} Güncellenecek alanlar
     */
    getUpdateFields() {
        const fields = [];
        
        if (this.name !== null) fields.push('name');
        if (this.activeIngredient !== null) fields.push('activeIngredient');
        if (this.manufacturer !== null) fields.push('manufacturer');
        if (this.dosageForm !== null) fields.push('dosageForm');
        if (this.strength !== null) fields.push('strength');
        if (this.packageSize !== null) fields.push('packageSize');
        if (this.description !== null) fields.push('description');
        
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
        
        if (this.name !== null) updateData.name = this.name;
        if (this.activeIngredient !== null) updateData.active_ingredient = this.activeIngredient;
        if (this.manufacturer !== null) updateData.manufacturer = this.manufacturer;
        if (this.dosageForm !== null) updateData.dosage_form = this.dosageForm;
        if (this.strength !== null) updateData.strength = this.strength;
        if (this.packageSize !== null) updateData.package_size = this.packageSize;
        if (this.description !== null) updateData.description = this.description;
        
        return updateData;
    }

    /**
     * İlaç için güncellenmiş tam açıklama oluşturur
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
     * İlaç için güncellenmiş kısa açıklama oluşturur
     * @returns {string} Kısa açıklama
     */
    getShortDescription() {
        if (this.name && this.strength) {
            return `${this.name} (${this.strength})`;
        }
        return this.name || 'Bilinmeyen İlaç';
    }
}

module.exports = UpdateMedicineDTO;
