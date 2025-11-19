/**
 * Kullanıcı Güncelleme DTO Sınıfı
 * Kullanıcı bilgilerini güncelleme için request veri transfer objesi
 */
class UpdateUserDTO {
    /**
     * Kullanıcı güncelleme DTO'sunu oluşturur
     * @param {Object} data - Kullanıcı güncelleme verileri
     */
    constructor(data = {}) {
        this.firstName = data.firstName || data.first_name || null;
        this.lastName = data.lastName || data.last_name || null;
        this.email = data.email || null;
        this.role = data.role || null;
        this.isActive = data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : null);
    }

    /**
     * DTO'yu UserEntity'ye dönüştürür
     * @returns {UserEntity} UserEntity objesi
     */
    toEntity() {
        const UserEntity = require('../entities/UserEntity');
        return new UserEntity({
            first_name: this.firstName,
            last_name: this.lastName,
            email: this.email,
            role: this.role,
            is_active: this.isActive
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        const result = {};
        
        if (this.firstName !== null) result.firstName = this.firstName;
        if (this.lastName !== null) result.lastName = this.lastName;
        if (this.email !== null) result.email = this.email;
        if (this.role !== null) result.role = this.role;
        if (this.isActive !== null) result.isActive = this.isActive;
        
        return result;
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (this.firstName !== null) {
            if (this.firstName.trim().length === 0) {
                errors.push('Ad alanı boş olamaz');
            } else if (this.firstName.trim().length < 2) {
                errors.push('Ad en az 2 karakter olmalıdır');
            }
        }

        if (this.lastName !== null) {
            if (this.lastName.trim().length === 0) {
                errors.push('Soyad alanı boş olamaz');
            } else if (this.lastName.trim().length < 2) {
                errors.push('Soyad en az 2 karakter olmalıdır');
            }
        }

        if (this.email !== null) {
            if (this.email.trim().length === 0) {
                errors.push('Email alanı boş olamaz');
            } else if (!this.isValidEmail(this.email)) {
                errors.push('Geçerli bir email adresi giriniz');
            }
        }

        if (this.role !== null) {
            if (!['user', 'admin'].includes(this.role)) {
                errors.push('Geçersiz kullanıcı rolü');
            }
        }

        if (this.isActive !== null) {
            if (typeof this.isActive !== 'boolean') {
                errors.push('Aktif durumu boolean değer olmalıdır');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Email formatını kontrol eder
     * @param {string} email - Email adresi
     * @returns {boolean} Geçerli ise true
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Güncellenecek alanların listesini döndürür
     * @returns {Array} Güncellenecek alanlar
     */
    getUpdateFields() {
        const fields = [];
        
        if (this.firstName !== null) fields.push('firstName');
        if (this.lastName !== null) fields.push('lastName');
        if (this.email !== null) fields.push('email');
        if (this.role !== null) fields.push('role');
        if (this.isActive !== null) fields.push('isActive');
        
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
        
        if (this.firstName !== null) updateData.first_name = this.firstName;
        if (this.lastName !== null) updateData.last_name = this.lastName;
        if (this.email !== null) updateData.email = this.email;
        if (this.role !== null) updateData.role = this.role;
        if (this.isActive !== null) updateData.is_active = this.isActive;
        
        return updateData;
    }
}

module.exports = UpdateUserDTO;
