/**
 * Son Kullanım Tarihi Uyarısı Repository Sınıfı
 * Uyarı veritabanı işlemlerini yönetir
 */
const { db } = require('../config/database');
const ExpiryAlertEntity = require('../entities/ExpiryAlertEntity');

class AlertRepository {
    /**
     * Tüm uyarıları getirir (kullanıcı bazlı)
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<ExpiryAlertEntity>>} Uyarı entity listesi
     */
    async findAll(userId) {
        try {
            const alerts = await db.query(`
                SELECT ea.*, ms.quantity, ms.expiry_date, ms.location,
                       m.name as medicine_name, m.barcode, m.active_ingredient
                FROM expiry_alerts ea
                JOIN medicine_stocks ms ON ea.medicine_stock_id = ms.id
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ea.user_id = ? AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ea.created_at DESC
            `, [userId, userId, userId]);
            
            return alerts.map(alert => new ExpiryAlertEntity(alert));
        } catch (error) {
            console.error('Uyarıları getirme hatası:', error);
            throw new Error('Uyarılar getirilemedi');
        }
    }

    /**
     * ID'ye göre uyarı getirir
     * @param {number} id - Uyarı ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<ExpiryAlertEntity|null>} Uyarı entity'si veya null
     */
    async findById(id, userId) {
        try {
            const alerts = await db.query(`
                SELECT ea.*, ms.quantity, ms.expiry_date, ms.location,
                       m.name as medicine_name, m.barcode, m.active_ingredient
                FROM expiry_alerts ea
                JOIN medicine_stocks ms ON ea.medicine_stock_id = ms.id
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ea.id = ? AND ea.user_id = ? AND ms.user_id = ? AND m.user_id = ?
            `, [id, userId, userId, userId]);
            
            return alerts.length > 0 ? new ExpiryAlertEntity(alerts[0]) : null;
        } catch (error) {
            console.error('Uyarı getirme hatası:', error);
            throw new Error('Uyarı getirilemedi');
        }
    }

    /**
     * Okunmamış uyarıları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<ExpiryAlertEntity>>} Uyarı entity listesi
     */
    async findUnread(userId) {
        try {
            const alerts = await db.query(`
                SELECT ea.*, ms.quantity, ms.expiry_date, ms.location,
                       m.name as medicine_name, m.barcode, m.active_ingredient
                FROM expiry_alerts ea
                JOIN medicine_stocks ms ON ea.medicine_stock_id = ms.id
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ea.user_id = ? AND ea.is_read = FALSE AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ea.created_at DESC
            `, [userId, userId, userId]);
            
            return alerts.map(alert => new ExpiryAlertEntity(alert));
        } catch (error) {
            console.error('Okunmamış uyarıları getirme hatası:', error);
            throw new Error('Okunmamış uyarılar getirilemedi');
        }
    }

    /**
     * Uyarı türüne göre uyarıları getirir
     * @param {string} alertType - Uyarı türü
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<ExpiryAlertEntity>>} Uyarı entity listesi
     */
    async findByType(alertType, userId) {
        try {
            const alerts = await db.query(`
                SELECT ea.*, ms.quantity, ms.expiry_date, ms.location,
                       m.name as medicine_name, m.barcode, m.active_ingredient
                FROM expiry_alerts ea
                JOIN medicine_stocks ms ON ea.medicine_stock_id = ms.id
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ea.alert_type = ? AND ea.user_id = ? AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ea.created_at DESC
            `, [alertType, userId, userId, userId]);
            
            return alerts.map(alert => new ExpiryAlertEntity(alert));
        } catch (error) {
            console.error('Uyarı türüne göre uyarıları getirme hatası:', error);
            throw new Error('Uyarı türüne göre uyarılar getirilemedi');
        }
    }

    /**
     * Stok ID'sine göre uyarıları getirir
     * @param {number} stockId - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<ExpiryAlertEntity>>} Uyarı entity listesi
     */
    async findByStockId(stockId, userId) {
        try {
            const alerts = await db.query(`
                SELECT ea.*, ms.quantity, ms.expiry_date, ms.location,
                       m.name as medicine_name, m.barcode, m.active_ingredient
                FROM expiry_alerts ea
                JOIN medicine_stocks ms ON ea.medicine_stock_id = ms.id
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ea.medicine_stock_id = ? AND ea.user_id = ? AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ea.created_at DESC
            `, [stockId, userId, userId, userId]);
            
            return alerts.map(alert => new ExpiryAlertEntity(alert));
        } catch (error) {
            console.error('Stok ID\'sine göre uyarıları getirme hatası:', error);
            throw new Error('Stok ID\'sine göre uyarılar getirilemedi');
        }
    }

    /**
     * Yeni uyarı oluşturur
     * @param {ExpiryAlertEntity} alertEntity - Uyarı entity'si
     * @returns {Promise<ExpiryAlertEntity>} Oluşturulan uyarı entity'si
     */
    async create(alertEntity) {
        try {
            const alertData = alertEntity.toDatabaseFormat();
            
            const result = await db.query(`
                INSERT INTO expiry_alerts (medicine_stock_id, alert_type, is_read, user_id)
                VALUES (?, ?, ?, ?)
            `, [
                alertData.medicine_stock_id,
                alertData.alert_type,
                alertData.is_read,
                alertData.user_id
            ]);
            
            // Oluşturulan uyarıyı getir
            const createdAlert = await this.findById(result.insertId, alertData.user_id);
            return createdAlert;
        } catch (error) {
            console.error('Uyarı oluşturma hatası:', error);
            throw new Error('Uyarı oluşturulamadı');
        }
    }

    /**
     * Uyarı bilgilerini günceller
     * @param {number} id - Uyarı ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {Object} updateData - Güncellenecek veriler
     * @returns {Promise<ExpiryAlertEntity|null>} Güncellenmiş uyarı entity'si veya null
     */
    async update(id, userId, updateData) {
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
            updateValues.push(id, userId);
            
            await db.query(`
                UPDATE expiry_alerts 
                SET ${updateFields.join(', ')}
                WHERE id = ? AND user_id = ?
            `, updateValues);
            
            // Güncellenmiş uyarıyı getir
            return await this.findById(id, userId);
        } catch (error) {
            console.error('Uyarı güncelleme hatası:', error);
            throw new Error('Uyarı güncellenemedi');
        }
    }

    /**
     * Uyarıyı okundu olarak işaretler
     * @param {number} id - Uyarı ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<boolean>} Güncelleme başarılı ise true
     */
    async markAsRead(id, userId) {
        try {
            const result = await db.query(`
                UPDATE expiry_alerts 
                SET is_read = TRUE, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            `, [id, userId]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Uyarıyı okundu işaretleme hatası:', error);
            throw new Error('Uyarı okundu olarak işaretlenemedi');
        }
    }

    /**
     * Tüm uyarıları okundu olarak işaretler
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<number>} Güncellenen uyarı sayısı
     */
    async markAllAsRead(userId) {
        try {
            const result = await db.query(`
                UPDATE expiry_alerts 
                SET is_read = TRUE, updated_at = NOW()
                WHERE is_read = FALSE AND user_id = ?
            `, [userId]);
            
            return result.affectedRows;
        } catch (error) {
            console.error('Tüm uyarıları okundu işaretleme hatası:', error);
            throw new Error('Tüm uyarılar okundu olarak işaretlenemedi');
        }
    }

    /**
     * Uyarıyı siler
     * @param {number} id - Uyarı ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<boolean>} Silme başarılı ise true
     */
    async delete(id, userId) {
        try {
            const result = await db.query(`
                DELETE FROM expiry_alerts 
                WHERE id = ? AND user_id = ?
            `, [id, userId]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Uyarı silme hatası:', error);
            throw new Error('Uyarı silinemedi');
        }
    }

    /**
     * Stok ID'sine göre uyarıları siler
     * @param {number} stockId - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<number>} Silinen uyarı sayısı
     */
    async deleteByStockId(stockId, userId) {
        try {
            const result = await db.query(`
                DELETE FROM expiry_alerts 
                WHERE medicine_stock_id = ? AND user_id = ?
            `, [stockId, userId]);
            
            return result.affectedRows;
        } catch (error) {
            console.error('Stok ID\'sine göre uyarıları silme hatası:', error);
            throw new Error('Stok ID\'sine göre uyarılar silinemedi');
        }
    }

    /**
     * Kullanıcının toplam uyarı sayısını getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<number>} Uyarı sayısı
     */
    async getCountByUser(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM expiry_alerts 
                WHERE user_id = ?
            `, [userId]);
            
            return result[0].count;
        } catch (error) {
            console.error('Uyarı sayısı getirme hatası:', error);
            throw new Error('Uyarı sayısı getirilemedi');
        }
    }

    /**
     * Kullanıcının okunmamış uyarı sayısını getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<number>} Okunmamış uyarı sayısı
     */
    async getUnreadCountByUser(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM expiry_alerts 
                WHERE user_id = ? AND is_read = FALSE
            `, [userId]);
            
            return result[0].count;
        } catch (error) {
            console.error('Okunmamış uyarı sayısı getirme hatası:', error);
            throw new Error('Okunmamış uyarı sayısı getirilemedi');
        }
    }

    /**
     * Kullanıcının uyarı istatistiklerini getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Uyarı istatistikleri
     */
    async getStatisticsByUser(userId) {
        try {
            const stats = await db.query(`
                SELECT 
                    alert_type,
                    COUNT(*) as count,
                    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
                FROM expiry_alerts
                WHERE user_id = ?
                GROUP BY alert_type
            `, [userId]);
            
            const totalStats = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread
                FROM expiry_alerts
                WHERE user_id = ?
            `, [userId]);
            
            return {
                total: totalStats[0].total,
                unread: totalStats[0].unread,
                by_type: stats
            };
        } catch (error) {
            console.error('Uyarı istatistikleri getirme hatası:', error);
            throw new Error('Uyarı istatistikleri getirilemedi');
        }
    }

    /**
     * Belirli bir stok için uyarı var mı kontrol eder
     * @param {number} stockId - Stok ID'si
     * @param {string} alertType - Uyarı türü
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<boolean>} Uyarı var ise true
     */
    async existsByStockAndType(stockId, alertType, userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM expiry_alerts 
                WHERE medicine_stock_id = ? AND alert_type = ? AND user_id = ?
            `, [stockId, alertType, userId]);
            
            return result[0].count > 0;
        } catch (error) {
            console.error('Uyarı varlık kontrolü hatası:', error);
            throw new Error('Uyarı varlık kontrolü yapılamadı');
        }
    }

    /**
     * Belirli bir tarihte oluşturulan uyarı var mı kontrol eder
     * @param {number} stockId - Stok ID'si
     * @param {string} alertType - Uyarı türü
     * @param {string} date - Tarih (YYYY-MM-DD formatında)
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<boolean>} Uyarı var ise true
     */
    async existsByStockTypeAndDate(stockId, alertType, date, userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM expiry_alerts 
                WHERE medicine_stock_id = ? AND alert_type = ? AND DATE(created_at) = ? AND user_id = ?
            `, [stockId, alertType, date, userId]);
            
            return result[0].count > 0;
        } catch (error) {
            console.error('Tarih bazlı uyarı varlık kontrolü hatası:', error);
            throw new Error('Tarih bazlı uyarı varlık kontrolü yapılamadı');
        }
    }
}

module.exports = AlertRepository;
