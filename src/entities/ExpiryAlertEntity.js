/**
 * Son Kullanım Tarihi Uyarısı Entity Sınıfı
 * Veritabanındaki expiry_alerts tablosunu temsil eder
 */
class ExpiryAlertEntity {
    /**
     * Uyarı entity'sini oluşturur
     * @param {Object} data - Uyarı verileri
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.medicineStockId = data.medicine_stock_id || data.medicineStockId || null;
        this.alertType = data.alert_type || data.alertType || null;
        this.isRead = data.is_read !== undefined ? data.is_read : false;
        this.userId = data.user_id || data.userId || null;
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
        
        // İlişkili veriler (JOIN sonuçları için)
        this.quantity = data.quantity || null;
        this.expiryDate = data.expiry_date || data.expiryDate || null;
        this.location = data.location || null;
        this.medicineName = data.medicine_name || null;
        this.barcode = data.barcode || null;
        this.activeIngredient = data.active_ingredient || null;
    }

    /**
     * Entity'yi AlertDTO'ya dönüştürür
     * @returns {Object} AlertDTO objesi
     */
    toDTO() {
        return {
            id: this.id,
            medicineStockId: this.medicineStockId,
            alertType: this.alertType,
            isRead: this.isRead,
            userId: this.userId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            quantity: this.quantity,
            expiryDate: this.expiryDate,
            location: this.location,
            medicineName: this.medicineName,
            barcode: this.barcode,
            activeIngredient: this.activeIngredient
        };
    }

    /**
     * Entity'yi veritabanı formatına dönüştürür
     * @returns {Object} Veritabanı formatında uyarı verisi
     */
    toDatabaseFormat() {
        return {
            id: this.id,
            medicine_stock_id: this.medicineStockId,
            alert_type: this.alertType,
            is_read: this.isRead,
            user_id: this.userId,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }

    /**
     * Uyarı türünün açıklamasını döndürür
     * @returns {string} Uyarı türü açıklaması
     */
    getAlertTypeDescription() {
        const descriptions = {
            'expired': 'Süresi Geçmiş',
            '7_days': '7 Gün İçinde Sona Erecek',
            '15_days': '15 Gün İçinde Sona Erecek',
            '30_days': '30 Gün İçinde Sona Erecek'
        };
        
        return descriptions[this.alertType] || 'Bilinmeyen Uyarı';
    }

    /**
     * Uyarı türünün önceliğini döndürür
     * @returns {number} Öncelik seviyesi (1: en yüksek, 4: en düşük)
     */
    getAlertPriority() {
        const priorities = {
            'expired': 1,
            '7_days': 2,
            '15_days': 3,
            '30_days': 4
        };
        
        return priorities[this.alertType] || 5;
    }

    /**
     * Uyarı türünün renk kodunu döndürür
     * @returns {string} Renk kodu
     */
    getAlertColor() {
        const colors = {
            'expired': 'red',
            '7_days': 'orange',
            '15_days': 'yellow',
            '30_days': 'blue'
        };
        
        return colors[this.alertType] || 'gray';
    }

    /**
     * Uyarının kritik olup olmadığını kontrol eder
     * @returns {boolean} Kritik ise true
     */
    isCritical() {
        return this.alertType === 'expired' || this.alertType === '7_days';
    }

    /**
     * Uyarının okunup okunmadığını kontrol eder
     * @returns {boolean} Okunmuş ise true
     */
    isReadAlert() {
        return this.isRead === true;
    }

    /**
     * Uyarıyı okundu olarak işaretler
     */
    markAsRead() {
        this.isRead = true;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Uyarı için tam açıklama oluşturur
     * @returns {string} Tam açıklama
     */
    getFullDescription() {
        const parts = [];
        if (this.medicineName) parts.push(this.medicineName);
        if (this.alertType) parts.push(`- ${this.getAlertTypeDescription()}`);
        if (this.expiryDate) parts.push(`Son kullanım: ${this.expiryDate}`);
        if (this.quantity) parts.push(`Miktar: ${this.quantity}`);
        if (this.location) parts.push(`Konum: ${this.location}`);
        
        return parts.join(' | ');
    }

    /**
     * Uyarı için kısa açıklama oluşturur
     * @returns {string} Kısa açıklama
     */
    getShortDescription() {
        if (this.medicineName && this.alertType) {
            return `${this.medicineName} - ${this.getAlertTypeDescription()}`;
        }
        return this.medicineName || 'Bilinmeyen Uyarı';
    }

    /**
     * Uyarının ne kadar süre önce oluşturulduğunu hesaplar
     * @returns {string} Süre açıklaması
     */
    getTimeAgo() {
        if (!this.createdAt) return 'Bilinmiyor';
        
        const createdDate = new Date(this.createdAt);
        const now = new Date();
        const diffTime = now - createdDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        
        if (diffDays > 0) {
            return `${diffDays} gün önce`;
        } else if (diffHours > 0) {
            return `${diffHours} saat önce`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} dakika önce`;
        } else {
            return 'Az önce';
        }
    }
}

module.exports = ExpiryAlertEntity;
