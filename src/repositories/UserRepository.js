/**
 * Kullanıcı Repository Sınıfı
 * Kullanıcı veritabanı işlemlerini yönetir
 */
const { db } = require('../config/database');
const UserEntity = require('../entities/UserEntity');

class UserRepository {
    /**
     * Tüm kullanıcıları getirir
     * @returns {Promise<Array<UserEntity>>} Kullanıcı entity listesi
     */
    async findAll() {
        try {
            const users = await db.query(`
                SELECT id, first_name, last_name, username, email, role, is_active, last_login, created_at, updated_at
                FROM users 
                ORDER BY created_at DESC
            `);
            
            return users.map(user => new UserEntity(user));
        } catch (error) {
            console.error('Kullanıcıları getirme hatası:', error);
            throw new Error('Kullanıcılar getirilemedi');
        }
    }

    /**
     * ID'ye göre kullanıcı getirir
     * @param {number} id - Kullanıcı ID'si
     * @returns {Promise<UserEntity|null>} Kullanıcı entity'si veya null
     */
    async findById(id) {
        try {
            const users = await db.query(`
                SELECT id, first_name, last_name, username, email, password_hash, role, is_active, last_login, created_at, updated_at
                FROM users 
                WHERE id = ?
            `, [id]);
            
            return users.length > 0 ? new UserEntity(users[0]) : null;
        } catch (error) {
            console.error('Kullanıcı getirme hatası:', error);
            throw new Error('Kullanıcı getirilemedi');
        }
    }

    /**
     * Kullanıcı adına göre kullanıcı getirir
     * @param {string} username - Kullanıcı adı
     * @returns {Promise<UserEntity|null>} Kullanıcı entity'si veya null
     */
    async findByUsername(username) {
        try {
            const users = await db.query(`
                SELECT id, first_name, last_name, username, email, password_hash, role, is_active, last_login, created_at, updated_at
                FROM users 
                WHERE username = ? AND is_active = TRUE
            `, [username]);
            
            return users.length > 0 ? new UserEntity(users[0]) : null;
        } catch (error) {
            console.error('Kullanıcı adı ile kullanıcı getirme hatası:', error);
            throw new Error('Kullanıcı getirilemedi');
        }
    }

    /**
     * Email'e göre kullanıcı getirir
     * @param {string} email - Email adresi
     * @returns {Promise<UserEntity|null>} Kullanıcı entity'si veya null
     */
    async findByEmail(email) {
        try {
            const users = await db.query(`
                SELECT id, first_name, last_name, username, email, password_hash, role, is_active, last_login, created_at, updated_at
                FROM users 
                WHERE email = ? AND is_active = TRUE
            `, [email]);
            
            return users.length > 0 ? new UserEntity(users[0]) : null;
        } catch (error) {
            console.error('Email ile kullanıcı getirme hatası:', error);
            throw new Error('Kullanıcı getirilemedi');
        }
    }

    /**
     * Kullanıcı adı veya email ile kullanıcı getirir
     * @param {string} identifier - Kullanıcı adı veya email
     * @returns {Promise<UserEntity|null>} Kullanıcı entity'si veya null
     */
    async findByUsernameOrEmail(identifier) {
        try {
            const users = await db.query(`
                SELECT id, first_name, last_name, username, email, password_hash, role, is_active, last_login, created_at, updated_at
                FROM users 
                WHERE (username = ? OR email = ?) AND is_active = TRUE
            `, [identifier, identifier]);
            
            return users.length > 0 ? new UserEntity(users[0]) : null;
        } catch (error) {
            console.error('Kullanıcı adı/email ile kullanıcı getirme hatası:', error);
            throw new Error('Kullanıcı getirilemedi');
        }
    }

    /**
     * Kullanıcı adı veya email'in benzersiz olup olmadığını kontrol eder
     * @param {string} username - Kullanıcı adı
     * @param {string} email - Email adresi
     * @param {number} excludeId - Hariç tutulacak kullanıcı ID'si (güncelleme için)
     * @returns {Promise<boolean>} Benzersiz ise true
     */
    async isUnique(username, email, excludeId = null) {
        try {
            let query = `
                SELECT COUNT(*) as count 
                FROM users 
                WHERE (username = ? OR email = ?)
            `;
            let params = [username, email];
            
            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }
            
            const result = await db.query(query, params);
            return result[0].count === 0;
        } catch (error) {
            console.error('Benzersizlik kontrolü hatası:', error);
            throw new Error('Benzersizlik kontrolü yapılamadı');
        }
    }

    /**
     * Yeni kullanıcı oluşturur
     * @param {UserEntity} userEntity - Kullanıcı entity'si
     * @returns {Promise<UserEntity>} Oluşturulan kullanıcı entity'si
     */
    async create(userEntity) {
        try {
            const userData = userEntity.toDatabaseFormat();
            
            const result = await db.query(`
                INSERT INTO users (first_name, last_name, username, email, password_hash, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                userData.first_name,
                userData.last_name,
                userData.username,
                userData.email,
                userData.password_hash,
                userData.role,
                userData.is_active
            ]);
            
            // Oluşturulan kullanıcıyı getir
            const createdUser = await this.findById(result.insertId);
            return createdUser;
        } catch (error) {
            console.error('Kullanıcı oluşturma hatası:', error);
            throw new Error('Kullanıcı oluşturulamadı');
        }
    }

    /**
     * Kullanıcı bilgilerini günceller
     * @param {number} id - Kullanıcı ID'si
     * @param {Object} updateData - Güncellenecek veriler
     * @returns {Promise<UserEntity|null>} Güncellenmiş kullanıcı entity'si veya null
     */
    async update(id, updateData) {
        try {
            const updateFields = [];
            const updateValues = [];
            
            // Güncellenecek alanları hazırla
            Object.keys(updateData).forEach(field => {
                if (updateData[field] !== undefined) {
                    updateFields.push(`${field} = ?`);
                    updateValues.push(updateData[field]);
                }
            });
            
            if (updateFields.length === 0) {
                throw new Error('Güncellenecek alan bulunamadı');
            }
            
            // Updated_at alanını ekle
            updateFields.push('updated_at = NOW()');
            updateValues.push(id);
            
            await db.query(`
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);
            
            // Güncellenmiş kullanıcıyı getir
            return await this.findById(id);
        } catch (error) {
            console.error('Kullanıcı güncelleme hatası:', error);
            throw new Error('Kullanıcı güncellenemedi');
        }
    }

    /**
     * Kullanıcıyı siler (soft delete)
     * @param {number} id - Kullanıcı ID'si
     * @returns {Promise<boolean>} Silme başarılı ise true
     */
    async delete(id) {
        try {
            const result = await db.query(`
                UPDATE users 
                SET is_active = FALSE, updated_at = NOW()
                WHERE id = ?
            `, [id]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            throw new Error('Kullanıcı silinemedi');
        }
    }

    /**
     * Kullanıcıyı fiziksel olarak siler
     * @param {number} id - Kullanıcı ID'si
     * @returns {Promise<boolean>} Silme başarılı ise true
     */
    async hardDelete(id) {
        try {
            const result = await db.query(`
                DELETE FROM users 
                WHERE id = ?
            `, [id]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Kullanıcı fiziksel silme hatası:', error);
            throw new Error('Kullanıcı silinemedi');
        }
    }

    /**
     * Kullanıcının son giriş tarihini günceller
     * @param {number} id - Kullanıcı ID'si
     * @returns {Promise<boolean>} Güncelleme başarılı ise true
     */
    async updateLastLogin(id) {
        try {
            const result = await db.query(`
                UPDATE users 
                SET last_login = NOW(), updated_at = NOW()
                WHERE id = ?
            `, [id]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Son giriş tarihi güncelleme hatası:', error);
            throw new Error('Son giriş tarihi güncellenemedi');
        }
    }

    /**
     * Kullanıcı şifresini günceller
     * @param {number} id - Kullanıcı ID'si
     * @param {string} passwordHash - Hash'lenmiş şifre
     * @returns {Promise<boolean>} Güncelleme başarılı ise true
     */
    async updatePassword(id, passwordHash) {
        try {
            const result = await db.query(`
                UPDATE users 
                SET password_hash = ?, updated_at = NOW()
                WHERE id = ?
            `, [passwordHash, id]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Şifre güncelleme hatası:', error);
            throw new Error('Şifre güncellenemedi');
        }
    }

    /**
     * Aktif kullanıcı sayısını getirir
     * @returns {Promise<number>} Aktif kullanıcı sayısı
     */
    async getActiveUserCount() {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM users 
                WHERE is_active = TRUE
            `);
            
            return result[0].count;
        } catch (error) {
            console.error('Aktif kullanıcı sayısı getirme hatası:', error);
            throw new Error('Aktif kullanıcı sayısı getirilemedi');
        }
    }

    /**
     * Kullanıcı istatistiklerini getirir
     * @returns {Promise<Object>} Kullanıcı istatistikleri
     */
    async getStatistics() {
        try {
            const stats = await db.query(`
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
                    SUM(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as recent_logins
                FROM users
            `);
            
            return stats[0];
        } catch (error) {
            console.error('Kullanıcı istatistikleri getirme hatası:', error);
            throw new Error('Kullanıcı istatistikleri getirilemedi');
        }
    }
}

module.exports = UserRepository;
