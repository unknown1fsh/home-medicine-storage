/**
 * İlaç Repository Sınıfı
 * İlaç veritabanı işlemlerini yönetir
 */
const { db } = require('../config/database');
const MedicineEntity = require('../entities/MedicineEntity');

class MedicineRepository {
    /**
     * Tüm ilaçları getirir (kullanıcı bazlı)
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<MedicineEntity>>} İlaç entity listesi
     */
    async findAll(userId) {
        try {
            const medicines = await db.query(`
                SELECT m.*, 
                       COUNT(ms.id) as stock_count,
                       MIN(ms.expiry_date) as nearest_expiry
                FROM medicines m
                LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
                WHERE m.user_id = ?
                GROUP BY m.id
                ORDER BY m.name
            `, [userId, userId]);
            
            return medicines.map(medicine => new MedicineEntity(medicine));
        } catch (error) {
            console.error('İlaçları getirme hatası:', error);
            throw new Error('İlaçlar getirilemedi');
        }
    }

    /**
     * ID'ye göre ilaç getirir
     * @param {number} id - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<MedicineEntity|null>} İlaç entity'si veya null
     */
    async findById(id, userId) {
        try {
            const medicines = await db.query(`
                SELECT m.*, 
                       COUNT(ms.id) as stock_count,
                       MIN(ms.expiry_date) as nearest_expiry
                FROM medicines m
                LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
                WHERE m.id = ? AND m.user_id = ?
                GROUP BY m.id
            `, [userId, id, userId]);
            
            return medicines.length > 0 ? new MedicineEntity(medicines[0]) : null;
        } catch (error) {
            console.error('İlaç getirme hatası:', error);
            throw new Error('İlaç getirilemedi');
        }
    }

    /**
     * Barkod'a göre ilaç getirir
     * @param {string} barcode - Barkod
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<MedicineEntity|null>} İlaç entity'si veya null
     */
    async findByBarcode(barcode, userId) {
        try {
            const medicines = await db.query(`
                SELECT m.*, 
                       COUNT(ms.id) as stock_count,
                       MIN(ms.expiry_date) as nearest_expiry
                FROM medicines m
                LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
                WHERE m.barcode = ? AND m.user_id = ?
                GROUP BY m.id
            `, [userId, barcode, userId]);
            
            return medicines.length > 0 ? new MedicineEntity(medicines[0]) : null;
        } catch (error) {
            console.error('Barkod ile ilaç getirme hatası:', error);
            throw new Error('İlaç getirilemedi');
        }
    }

    /**
     * İlaç adına göre arama yapar
     * @param {string} name - İlaç adı (kısmi arama)
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<MedicineEntity>>} İlaç entity listesi
     */
    async findByName(name, userId) {
        try {
            const medicines = await db.query(`
                SELECT m.*, 
                       COUNT(ms.id) as stock_count,
                       MIN(ms.expiry_date) as nearest_expiry
                FROM medicines m
                LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
                WHERE m.name LIKE ? AND m.user_id = ?
                GROUP BY m.id
                ORDER BY m.name
            `, [userId, `%${name}%`, userId]);
            
            return medicines.map(medicine => new MedicineEntity(medicine));
        } catch (error) {
            console.error('İlaç adı ile arama hatası:', error);
            throw new Error('İlaç araması yapılamadı');
        }
    }

    /**
     * Etken maddeye göre arama yapar
     * @param {string} activeIngredient - Etken madde (kısmi arama)
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Array<MedicineEntity>>} İlaç entity listesi
     */
    async findByActiveIngredient(activeIngredient, userId) {
        try {
            const medicines = await db.query(`
                SELECT m.*, 
                       COUNT(ms.id) as stock_count,
                       MIN(ms.expiry_date) as nearest_expiry
                FROM medicines m
                LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
                WHERE m.active_ingredient LIKE ? AND m.user_id = ?
                GROUP BY m.id
                ORDER BY m.name
            `, [userId, `%${activeIngredient}%`, userId]);
            
            return medicines.map(medicine => new MedicineEntity(medicine));
        } catch (error) {
            console.error('Etken madde ile arama hatası:', error);
            throw new Error('İlaç araması yapılamadı');
        }
    }

    /**
     * Barkod'un benzersiz olup olmadığını kontrol eder
     * @param {string} barcode - Barkod
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} excludeId - Hariç tutulacak ilaç ID'si (güncelleme için)
     * @returns {Promise<boolean>} Benzersiz ise true
     */
    async isBarcodeUnique(barcode, userId, excludeId = null) {
        try {
            let query = `
                SELECT COUNT(*) as count 
                FROM medicines 
                WHERE barcode = ? AND user_id = ?
            `;
            let params = [barcode, userId];
            
            if (excludeId) {
                query += ' AND id != ?';
                params.push(excludeId);
            }
            
            const result = await db.query(query, params);
            return result[0].count === 0;
        } catch (error) {
            console.error('Barkod benzersizlik kontrolü hatası:', error);
            throw new Error('Barkod benzersizlik kontrolü yapılamadı');
        }
    }

    /**
     * Yeni ilaç oluşturur
     * @param {MedicineEntity} medicineEntity - İlaç entity'si
     * @returns {Promise<MedicineEntity>} Oluşturulan ilaç entity'si
     */
    async create(medicineEntity) {
        try {
            const medicineData = medicineEntity.toDatabaseFormat();
            
            const result = await db.query(`
                INSERT INTO medicines (barcode, name, active_ingredient, manufacturer, dosage_form, strength, package_size, description, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                medicineData.barcode,
                medicineData.name,
                medicineData.active_ingredient,
                medicineData.manufacturer,
                medicineData.dosage_form,
                medicineData.strength,
                medicineData.package_size,
                medicineData.description,
                medicineData.user_id
            ]);
            
            // Oluşturulan ilacı getir
            const createdMedicine = await this.findById(result.insertId, medicineData.user_id);
            return createdMedicine;
        } catch (error) {
            console.error('İlaç oluşturma hatası:', error);
            throw new Error('İlaç oluşturulamadı');
        }
    }

    /**
     * İlaç bilgilerini günceller
     * @param {number} id - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {Object} updateData - Güncellenecek veriler
     * @returns {Promise<MedicineEntity|null>} Güncellenmiş ilaç entity'si veya null
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
                UPDATE medicines 
                SET ${updateFields.join(', ')}
                WHERE id = ? AND user_id = ?
            `, updateValues);
            
            // Güncellenmiş ilacı getir
            return await this.findById(id, userId);
        } catch (error) {
            console.error('İlaç güncelleme hatası:', error);
            throw new Error('İlaç güncellenemedi');
        }
    }

    /**
     * İlacı siler
     * @param {number} id - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<boolean>} Silme başarılı ise true
     */
    async delete(id, userId) {
        try {
            const result = await db.query(`
                DELETE FROM medicines 
                WHERE id = ? AND user_id = ?
            `, [id, userId]);
            
            return result.affectedRows > 0;
        } catch (error) {
            console.error('İlaç silme hatası:', error);
            throw new Error('İlaç silinemedi');
        }
    }

    /**
     * İlacın stokları var mı kontrol eder
     * @param {number} id - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<boolean>} Stok var ise true
     */
    async hasStocks(id, userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM medicine_stocks 
                WHERE medicine_id = ? AND user_id = ?
            `, [id, userId]);
            
            return result[0].count > 0;
        } catch (error) {
            console.error('Stok kontrolü hatası:', error);
            throw new Error('Stok kontrolü yapılamadı');
        }
    }

    /**
     * Kullanıcının toplam ilaç sayısını getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<number>} İlaç sayısı
     */
    async getCountByUser(userId) {
        try {
            const result = await db.query(`
                SELECT COUNT(*) as count 
                FROM medicines 
                WHERE user_id = ?
            `, [userId]);
            
            return result[0].count;
        } catch (error) {
            console.error('İlaç sayısı getirme hatası:', error);
            throw new Error('İlaç sayısı getirilemedi');
        }
    }

    /**
     * Kullanıcının ilaç istatistiklerini getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İlaç istatistikleri
     */
    async getStatisticsByUser(userId) {
        try {
            const stats = await db.query(`
                SELECT 
                    COUNT(m.id) as total_medicines,
                    COUNT(DISTINCT m.manufacturer) as unique_manufacturers,
                    COUNT(DISTINCT m.active_ingredient) as unique_ingredients,
                    COUNT(CASE WHEN ms.id IS NOT NULL THEN 1 END) as medicines_with_stock,
                    COUNT(CASE WHEN ms.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as medicines_expiring_soon
                FROM medicines m
                LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
                WHERE m.user_id = ?
            `, [userId, userId]);
            
            return stats[0];
        } catch (error) {
            console.error('İlaç istatistikleri getirme hatası:', error);
            throw new Error('İlaç istatistikleri getirilemedi');
        }
    }

    /**
     * Yaklaşan son kullanım tarihli ilaçları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} days - Kaç gün içinde (varsayılan: 30)
     * @returns {Promise<Array<MedicineEntity>>} İlaç entity listesi
     */
    async findExpiringSoon(userId, days = 30) {
        try {
            const medicines = await db.query(`
                SELECT m.*, 
                       COUNT(ms.id) as stock_count,
                       MIN(ms.expiry_date) as nearest_expiry
                FROM medicines m
                LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
                WHERE m.user_id = ? AND ms.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
                GROUP BY m.id
                ORDER BY ms.expiry_date ASC
            `, [userId, userId, days]);
            
            return medicines.map(medicine => new MedicineEntity(medicine));
        } catch (error) {
            console.error('Yaklaşan son kullanım tarihli ilaçları getirme hatası:', error);
            throw new Error('Yaklaşan son kullanım tarihli ilaçlar getirilemedi');
        }
    }
}

module.exports = MedicineRepository;
