/**
 * İlaç Stoku Repository Sınıfı
 * İlaç stoku veritabanı işlemlerini yönetir
 */
const { db } = require('../config/database');
const MedicineStockEntity = require('../entities/MedicineStockEntity');

class StockRepository {
    /**
     * Tüm stokları getirir (kullanıcı bazlı)
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<MedicineStockEntity>>} Stok entity listesi
     */
    async findAll(userId) {
        try {
            const stocks = await db.query(`
                SELECT ms.*, m.name as medicine_name, m.barcode, m.active_ingredient, m.manufacturer
                FROM medicine_stocks ms
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ms.user_id = ? AND m.user_id = ?
                ORDER BY ms.expiry_date ASC
            `, [userId, userId]);
            
            return stocks.map(stock => {
                const entity = new MedicineStockEntity(stock);
                entity.calculateStatus(); // Durumu hesapla
                return entity;
            });
        } catch (error) {
            console.error('Stokları getirme hatası:', error);
            throw new Error('Stoklar getirilemedi');
        }
    }

    /**
     * ID'ye göre stok getirir
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<MedicineStockEntity|null>} Stok entity'si veya null
     */
    async findById(id, userId) {
        try {
            const stocks = await db.query(`
                SELECT ms.*, m.name as medicine_name, m.barcode, m.active_ingredient, m.manufacturer
                FROM medicine_stocks ms
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ms.id = ? AND ms.user_id = ? AND m.user_id = ?
            `, [id, userId, userId]);
            
            if (stocks.length > 0) {
                const entity = new MedicineStockEntity(stocks[0]);
                entity.calculateStatus(); // Durumu hesapla
                return entity;
            }
            
            return null;
        } catch (error) {
            console.error('Stok getirme hatası:', error);
            throw new Error('Stok getirilemedi');
        }
    }

    /**
     * Belirli bir ilacın stoklarını getirir
     * @param {number} medicineId - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<MedicineStockEntity>>} Stok entity listesi
     */
    async findByMedicineId(medicineId, userId) {
        try {
            const stocks = await db.query(`
                SELECT ms.*, m.name as medicine_name, m.barcode
                FROM medicine_stocks ms
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ms.medicine_id = ? AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ms.expiry_date ASC
            `, [medicineId, userId, userId]);
            
            return stocks.map(stock => {
                const entity = new MedicineStockEntity(stock);
                entity.calculateStatus(); // Durumu hesapla
                return entity;
            });
        } catch (error) {
            console.error('İlaç stokları getirme hatası:', error);
            throw new Error('İlaç stokları getirilemedi');
        }
    }

    /**
     * Yaklaşan son kullanım tarihli stokları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} days - Kaç gün içinde
     * @returns {Promise<Array<MedicineStockEntity>>} Stok entity listesi
     */
    async findExpiringSoon(userId, days) {
        try {
            const stocks = await db.query(`
                SELECT ms.*, m.name as medicine_name, m.barcode, m.active_ingredient
                FROM medicine_stocks ms
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ms.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ms.expiry_date ASC
            `, [days, userId, userId]);
            
            return stocks.map(stock => {
                const entity = new MedicineStockEntity(stock);
                entity.calculateStatus(); // Durumu hesapla
                return entity;
            });
        } catch (error) {
            console.error('Yaklaşan son kullanım tarihli stokları getirme hatası:', error);
            throw new Error('Yaklaşan son kullanım tarihli stoklar getirilemedi');
        }
    }

    /**
     * Süresi geçmiş stokları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<MedicineStockEntity>>} Stok entity listesi
     */
    async findExpired(userId) {
        try {
            const stocks = await db.query(`
                SELECT ms.*, m.name as medicine_name, m.barcode, m.active_ingredient
                FROM medicine_stocks ms
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ms.expiry_date < CURDATE() AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ms.expiry_date ASC
            `, [userId, userId]);
            
            return stocks.map(stock => {
                const entity = new MedicineStockEntity(stock);
                entity.calculateStatus(); // Durumu hesapla
                return entity;
            });
        } catch (error) {
            console.error('Süresi geçmiş stokları getirme hatası:', error);
            throw new Error('Süresi geçmiş stoklar getirilemedi');
        }
    }

    /**
     * Konuma göre stokları getirir
     * @param {string} location - Konum
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<MedicineStockEntity>>} Stok entity listesi
     */
    async findByLocation(location, userId) {
        try {
            const stocks = await db.query(`
                SELECT ms.*, m.name as medicine_name, m.barcode, m.active_ingredient, m.manufacturer
                FROM medicine_stocks ms
                JOIN medicines m ON ms.medicine_id = m.id
                WHERE ms.location = ? AND ms.user_id = ? AND m.user_id = ?
                ORDER BY ms.expiry_date ASC
            `, [location, userId, userId]);
            
            return stocks.map(stock => {
                const entity = new MedicineStockEntity(stock);
                entity.calculateStatus(); // Durumu hesapla
                return entity;
            });
        } catch (error) {
            console.error('Konuma göre stokları getirme hatası:', error);
            throw new Error('Konuma göre stoklar getirilemedi');
        }
    }

    /**
     * Yeni stok oluşturur
     * @param {MedicineStockEntity} stockEntity - Stok entity'si
     * @returns {Promise<MedicineStockEntity>} Oluşturulan stok entity'si
     */
    async create(stockEntity) {
        try {
            const stockData = stockEntity.toDatabaseFormat();
            
            const result = await db.query(`
                INSERT INTO medicine_stocks (medicine_id, quantity, purchase_date, expiry_date, purchase_price, location, notes, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                stockData.medicine_id,
                stockData.quantity,
                stockData.purchase_date,
                stockData.expiry_date,
                stockData.purchase_price,
                stockData.location,
                stockData.notes,
                stockData.user_id
            ]);
            
            // Oluşturulan stoku getir
            const createdStock = await this.findById(result.insertId, stockData.user_id);
            return createdStock;
        } catch (error) {
            console.error('Stok oluşturma hatası:', error);
            throw new Error('Stok oluşturulamadı');
        }
    }

    /**
     * Stok bilgilerini günceller
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {Object} updateData - Güncellenecek veriler
     * @returns {Promise<MedicineStockEntity|null>} Güncellenmiş stok entity'si veya null
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
                UPDATE medicine_stocks 
                SET ${updateFields.join(', ')}
                WHERE id = ? AND user_id = ?
            `, updateValues);
            
            // Güncellenmiş stoku getir
            return await this.findById(id, userId);
        } catch (error) {
            console.error('Stok güncelleme hatası:', error);
            throw new Error('Stok güncellenemedi');
        }
    }

    /**
     * Stoku siler
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<boolean>} Silme başarılı ise true
     */
    async delete(id, userId) {
        try {
            const result = await db.query(`
                DELETE FROM medicine_stocks 
                WHERE id = ? AND user_id = ?
            `, [id, userId]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('Stok silme hatası:', error);
            throw new Error('Stok silinemedi');
        }
    }

    /**
     * İlacın tüm stoklarını siler
     * @param {number} medicineId - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<number>} Silinen stok sayısı
     */
    async deleteByMedicineId(medicineId, userId) {
        try {
            const result = await db.query(`
                DELETE FROM medicine_stocks 
                WHERE medicine_id = ? AND user_id = ?
            `, [medicineId, userId]);
            
            return result.affectedRows;
        } catch (error) {
            console.error('İlaç stoklarını silme hatası:', error);
            throw new Error('İlaç stokları silinemedi');
        }
    }

    /**
     * Kullanıcının toplam stok sayısını getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<number>} Stok sayısı
     */
    async getCountByUser(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM medicine_stocks 
                WHERE user_id = ?
            `, [userId]);
            
            return result[0].count;
        } catch (error) {
            console.error('Stok sayısı getirme hatası:', error);
            throw new Error('Stok sayısı getirilemedi');
        }
    }

    /**
     * Kullanıcının stok istatistiklerini getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Stok istatistikleri
     */
    async getStatisticsByUser(userId) {
        try {
            const stats = await db.query(`
                SELECT 
                    COUNT(*) as total_stocks,
                    SUM(quantity) as total_quantity,
                    COUNT(CASE WHEN expiry_date < CURDATE() THEN 1 END) as expired_stocks,
                    COUNT(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as critical_stocks,
                    COUNT(CASE WHEN expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as warning_stocks,
                    COUNT(DISTINCT medicine_id) as unique_medicines,
                    COUNT(DISTINCT location) as unique_locations
                FROM medicine_stocks 
                WHERE user_id = ?
            `, [userId]);
            
            return stats[0];
        } catch (error) {
            console.error('Stok istatistikleri getirme hatası:', error);
            throw new Error('Stok istatistikleri getirilemedi');
        }
    }

    /**
     * Stok miktarını günceller
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} quantity - Yeni miktar
     * @returns {Promise<MedicineStockEntity|null>} Güncellenmiş stok entity'si veya null
     */
    async updateQuantity(id, userId, quantity) {
        try {
            const result = await db.query(`
                UPDATE medicine_stocks 
                SET quantity = ?, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            `, [quantity, id, userId]);
            
            if (result.affectedRows > 0) {
                return await this.findById(id, userId);
            }
            
            return null;
        } catch (error) {
            console.error('Stok miktarı güncelleme hatası:', error);
            throw new Error('Stok miktarı güncellenemedi');
        }
    }

    /**
     * Stok miktarını azaltır
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} amount - Azaltılacak miktar
     * @returns {Promise<MedicineStockEntity|null>} Güncellenmiş stok entity'si veya null
     */
    async decreaseQuantity(id, userId, amount) {
        try {
            const result = await db.query(`
                UPDATE medicine_stocks 
                SET quantity = GREATEST(0, quantity - ?), updated_at = NOW()
                WHERE id = ? AND user_id = ?
            `, [amount, id, userId]);
            
            if (result.affectedRows > 0) {
                return await this.findById(id, userId);
            }
            
            return null;
        } catch (error) {
            console.error('Stok miktarı azaltma hatası:', error);
            throw new Error('Stok miktarı azaltılamadı');
        }
    }

    /**
     * Stok miktarını artırır
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} amount - Artırılacak miktar
     * @returns {Promise<MedicineStockEntity|null>} Güncellenmiş stok entity'si veya null
     */
    async increaseQuantity(id, userId, amount) {
        try {
            const result = await db.query(`
                UPDATE medicine_stocks 
                SET quantity = quantity + ?, updated_at = NOW()
                WHERE id = ? AND user_id = ?
            `, [amount, id, userId]);
            
            if (result.affectedRows > 0) {
                return await this.findById(id, userId);
            }
            
            return null;
        } catch (error) {
            console.error('Stok miktarı artırma hatası:', error);
            throw new Error('Stok miktarı artırılamadı');
        }
    }
}

module.exports = StockRepository;
