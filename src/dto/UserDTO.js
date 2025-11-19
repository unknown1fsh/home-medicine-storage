/**
 * Kullanıcı DTO Sınıfı
 * API response'ları için kullanıcı veri transfer objesi
 */
class UserDTO {
    /**
     * Kullanıcı DTO'sunu oluşturur
     * @param {Object} data - Kullanıcı verileri
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.firstName = data.firstName || data.first_name || null;
        this.lastName = data.lastName || data.last_name || null;
        this.username = data.username || null;
        this.email = data.email || null;
        this.role = data.role || 'user';
        this.isActive = data.isActive !== undefined ? data.isActive : (data.is_active !== undefined ? data.is_active : true);
        this.lastLogin = data.lastLogin || data.last_login || null;
        this.createdAt = data.createdAt || data.created_at || null;
        this.updatedAt = data.updatedAt || data.updated_at || null;
    }

    /**
     * DTO'yu UserEntity'ye dönüştürür
     * @returns {UserEntity} UserEntity objesi
     */
    toEntity() {
        const UserEntity = require('../entities/UserEntity');
        return new UserEntity({
            id: this.id,
            first_name: this.firstName,
            last_name: this.lastName,
            username: this.username,
            email: this.email,
            role: this.role,
            is_active: this.isActive,
            last_login: this.lastLogin,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        return {
            id: this.id,
            firstName: this.firstName,
            lastName: this.lastName,
            username: this.username,
            email: this.email,
            role: this.role,
            isActive: this.isActive,
            lastLogin: this.lastLogin,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Kullanıcının tam adını döndürür
     * @returns {string} Tam ad
     */
    getFullName() {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }

    /**
     * Kullanıcının admin olup olmadığını kontrol eder
     * @returns {boolean} Admin ise true
     */
    isAdmin() {
        return this.role === 'admin';
    }

    /**
     * Kullanıcının aktif olup olmadığını kontrol eder
     * @returns {boolean} Aktif ise true
     */
    isUserActive() {
        return this.isActive === true;
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (!this.firstName || this.firstName.trim().length === 0) {
            errors.push('Ad alanı zorunludur');
        }

        if (!this.lastName || this.lastName.trim().length === 0) {
            errors.push('Soyad alanı zorunludur');
        }

        if (!this.username || this.username.trim().length === 0) {
            errors.push('Kullanıcı adı zorunludur');
        }

        if (!this.email || this.email.trim().length === 0) {
            errors.push('Email alanı zorunludur');
        } else if (!this.isValidEmail(this.email)) {
            errors.push('Geçerli bir email adresi giriniz');
        }

        if (!['user', 'admin'].includes(this.role)) {
            errors.push('Geçersiz kullanıcı rolü');
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
}

module.exports = UserDTO;
