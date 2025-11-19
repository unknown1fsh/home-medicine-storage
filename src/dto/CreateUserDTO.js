/**
 * Kullanıcı Oluşturma DTO Sınıfı
 * Yeni kullanıcı kaydı için request veri transfer objesi
 */
class CreateUserDTO {
    /**
     * Kullanıcı oluşturma DTO'sunu oluşturur
     * @param {Object} data - Kullanıcı oluşturma verileri
     */
    constructor(data = {}) {
        this.firstName = data.firstName || data.first_name || null;
        this.lastName = data.lastName || data.last_name || null;
        this.username = data.username || null;
        this.email = data.email || null;
        this.password = data.password || null;
        this.role = data.role || 'user';
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
            username: this.username,
            email: this.email,
            role: this.role,
            is_active: true
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        return {
            firstName: this.firstName,
            lastName: this.lastName,
            username: this.username,
            email: this.email,
            role: this.role
        };
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (!this.firstName || this.firstName.trim().length === 0) {
            errors.push('Ad alanı zorunludur');
        } else if (this.firstName.trim().length < 2) {
            errors.push('Ad en az 2 karakter olmalıdır');
        }

        if (!this.lastName || this.lastName.trim().length === 0) {
            errors.push('Soyad alanı zorunludur');
        } else if (this.lastName.trim().length < 2) {
            errors.push('Soyad en az 2 karakter olmalıdır');
        }

        if (!this.username || this.username.trim().length === 0) {
            errors.push('Kullanıcı adı zorunludur');
        } else if (this.username.trim().length < 3) {
            errors.push('Kullanıcı adı en az 3 karakter olmalıdır');
        } else if (!this.isValidUsername(this.username)) {
            errors.push('Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir');
        }

        if (!this.email || this.email.trim().length === 0) {
            errors.push('Email alanı zorunludur');
        } else if (!this.isValidEmail(this.email)) {
            errors.push('Geçerli bir email adresi giriniz');
        }

        if (!this.password || this.password.length === 0) {
            errors.push('Şifre alanı zorunludur');
        } else if (this.password.length < 6) {
            errors.push('Şifre en az 6 karakter olmalıdır');
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

    /**
     * Kullanıcı adı formatını kontrol eder
     * @param {string} username - Kullanıcı adı
     * @returns {boolean} Geçerli ise true
     */
    isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        return usernameRegex.test(username);
    }

    /**
     * Şifre güvenlik kontrolü yapar
     * @returns {Object} Güvenlik kontrolü sonucu
     */
    validatePasswordSecurity() {
        const errors = [];

        if (this.password.length < 6) {
            errors.push('Şifre en az 6 karakter olmalıdır');
        }

        if (this.password.length > 128) {
            errors.push('Şifre en fazla 128 karakter olabilir');
        }

        // İsteğe bağlı güvenlik kontrolleri
        if (!/[A-Z]/.test(this.password)) {
            errors.push('Şifre en az bir büyük harf içermelidir');
        }

        if (!/[a-z]/.test(this.password)) {
            errors.push('Şifre en az bir küçük harf içermelidir');
        }

        if (!/[0-9]/.test(this.password)) {
            errors.push('Şifre en az bir rakam içermelidir');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            strength: this.calculatePasswordStrength()
        };
    }

    /**
     * Şifre gücünü hesaplar
     * @returns {string} Şifre gücü seviyesi
     */
    calculatePasswordStrength() {
        let score = 0;

        if (this.password.length >= 8) score += 1;
        if (this.password.length >= 12) score += 1;
        if (/[A-Z]/.test(this.password)) score += 1;
        if (/[a-z]/.test(this.password)) score += 1;
        if (/[0-9]/.test(this.password)) score += 1;
        if (/[^A-Za-z0-9]/.test(this.password)) score += 1;

        if (score <= 2) return 'weak';
        if (score <= 4) return 'medium';
        return 'strong';
    }
}

module.exports = CreateUserDTO;
