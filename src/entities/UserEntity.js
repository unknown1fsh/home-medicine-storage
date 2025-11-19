/**
 * Kullanıcı Entity Sınıfı
 * Veritabanındaki users tablosunu temsil eder
 */
class UserEntity {
    /**
     * Kullanıcı entity'sini oluşturur
     * @param {Object} data - Kullanıcı verileri
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.firstName = data.first_name || data.firstName || null;
        this.lastName = data.last_name || data.lastName || null;
        this.username = data.username || null;
        this.email = data.email || null;
        this.passwordHash = data.password_hash || data.passwordHash || null;
        this.role = data.role || 'user';
        this.isActive = data.is_active !== undefined ? data.is_active : true;
        this.lastLogin = data.last_login || null;
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
    }

    /**
     * Entity'yi UserDTO'ya dönüştürür
     * @returns {Object} UserDTO objesi
     */
    toDTO() {
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
     * Entity'yi veritabanı formatına dönüştürür
     * @returns {Object} Veritabanı formatında kullanıcı verisi
     */
    toDatabaseFormat() {
        return {
            id: this.id,
            first_name: this.firstName,
            last_name: this.lastName,
            username: this.username,
            email: this.email,
            password_hash: this.passwordHash,
            role: this.role,
            is_active: this.isActive,
            last_login: this.lastLogin,
            created_at: this.createdAt,
            updated_at: this.updatedAt
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
}

module.exports = UserEntity;
