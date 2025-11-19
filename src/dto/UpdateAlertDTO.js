/**
 * Son Kullanım Tarihi Uyarısı Güncelleme DTO Sınıfı
 * Uyarı bilgilerini güncelleme için request veri transfer objesi
 */
class UpdateAlertDTO {
    /**
     * Uyarı güncelleme DTO'sunu oluşturur
     * @param {Object} data - Uyarı güncelleme verileri
     */
    constructor(data = {}) {
        this.isRead = data.isRead !== undefined ? data.isRead : (data.is_read !== undefined ? data.is_read : null);
    }

    /**
     * DTO'yu ExpiryAlertEntity'ye dönüştürür
     * @returns {ExpiryAlertEntity} ExpiryAlertEntity objesi
     */
    toEntity() {
        const ExpiryAlertEntity = require('../entities/ExpiryAlertEntity');
        return new ExpiryAlertEntity({
            is_read: this.isRead
        });
    }

    /**
     * DTO'yu JSON formatına dönüştürür
     * @returns {Object} JSON objesi
     */
    toJSON() {
        const result = {};
        
        if (this.isRead !== null) result.isRead = this.isRead;
        
        return result;
    }

    /**
     * DTO validasyonu yapar
     * @returns {Object} Validasyon sonucu
     */
    validate() {
        const errors = [];

        if (this.isRead !== null) {
            if (typeof this.isRead !== 'boolean') {
                errors.push('Okundu durumu boolean değer olmalıdır');
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
        
        if (this.isRead !== null) fields.push('isRead');
        
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
        
        if (this.isRead !== null) updateData.is_read = this.isRead;
        
        return updateData;
    }

    /**
     * Uyarıyı okundu olarak işaretler
     */
    markAsRead() {
        this.isRead = true;
    }

    /**
     * Uyarıyı okunmamış olarak işaretler
     */
    markAsUnread() {
        this.isRead = false;
    }

    /**
     * Uyarı durumunu değiştirir
     * @param {boolean} readStatus - Okundu durumu
     */
    setReadStatus(readStatus) {
        this.isRead = readStatus;
    }
}

module.exports = UpdateAlertDTO;
