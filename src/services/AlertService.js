/**
 * Son Kullanım Tarihi Uyarısı Servisi
 * Uyarı iş mantığını yönetir
 */
const AlertRepository = require('../repositories/AlertRepository');
const StockRepository = require('../repositories/StockRepository');
const AlertDTO = require('../dto/AlertDTO');
const UpdateAlertDTO = require('../dto/UpdateAlertDTO');
const ExpiryAlertEntity = require('../entities/ExpiryAlertEntity');

class AlertService {
    constructor() {
        this.alertRepository = new AlertRepository();
        this.stockRepository = new StockRepository();
    }

    /**
     * Tüm uyarıları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Uyarı listesi sonucu
     */
    async getAllAlerts(userId) {
        try {
            const alerts = await this.alertRepository.findAll(userId);

            // DTO'ya dönüştür
            const alertDTOs = alerts.map(alert => alert.toDTO());

            return {
                success: true,
                data: alertDTOs
            };

        } catch (error) {
            console.error('Uyarıları getirme hatası:', error);
            return {
                success: false,
                message: 'Uyarılar getirilemedi'
            };
        }
    }

    /**
     * ID'ye göre uyarı getirir
     * @param {number} id - Uyarı ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Uyarı sonucu
     */
    async getAlertById(id, userId) {
        try {
            const alert = await this.alertRepository.findById(id, userId);

            if (!alert) {
                return {
                    success: false,
                    message: 'Uyarı bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const alertDTO = alert.toDTO();

            return {
                success: true,
                data: alertDTO
            };

        } catch (error) {
            console.error('Uyarı getirme hatası:', error);
            return {
                success: false,
                message: 'Uyarı getirilemedi'
            };
        }
    }

    /**
     * Okunmamış uyarıları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Uyarı listesi sonucu
     */
    async getUnreadAlerts(userId) {
        try {
            const alerts = await this.alertRepository.findUnread(userId);

            // DTO'ya dönüştür
            const alertDTOs = alerts.map(alert => alert.toDTO());

            return {
                success: true,
                data: alertDTOs
            };

        } catch (error) {
            console.error('Okunmamış uyarıları getirme hatası:', error);
            return {
                success: false,
                message: 'Okunmamış uyarılar getirilemedi'
            };
        }
    }

    /**
     * Uyarıyı okundu olarak işaretler
     * @param {number} id - Uyarı ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İşaretleme sonucu
     */
    async markAlertAsRead(id, userId) {
        try {
            const updated = await this.alertRepository.markAsRead(id, userId);

            if (!updated) {
                return {
                    success: false,
                    message: 'Uyarı bulunamadı'
                };
            }

            return {
                success: true,
                message: 'Uyarı okundu olarak işaretlendi'
            };

        } catch (error) {
            console.error('Uyarı okundu işaretleme hatası:', error);
            return {
                success: false,
                message: 'Uyarı okundu olarak işaretlenirken hata oluştu'
            };
        }
    }

    /**
     * Tüm uyarıları okundu olarak işaretler
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İşaretleme sonucu
     */
    async markAllAlertsAsRead(userId) {
        try {
            const updatedCount = await this.alertRepository.markAllAsRead(userId);

            return {
                success: true,
                message: `Tüm uyarılar okundu olarak işaretlendi (${updatedCount} uyarı)`
            };

        } catch (error) {
            console.error('Tüm uyarıları okundu işaretleme hatası:', error);
            return {
                success: false,
                message: 'Tüm uyarılar okundu olarak işaretlenirken hata oluştu'
            };
        }
    }

    /**
     * Uyarıyı siler
     * @param {number} id - Uyarı ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Silme sonucu
     */
    async deleteAlert(id, userId) {
        try {
            const deleted = await this.alertRepository.delete(id, userId);

            if (!deleted) {
                return {
                    success: false,
                    message: 'Uyarı bulunamadı'
                };
            }

            return {
                success: true,
                message: 'Uyarı başarıyla silindi'
            };

        } catch (error) {
            console.error('Uyarı silme hatası:', error);
            return {
                success: false,
                message: 'Uyarı silinirken hata oluştu'
            };
        }
    }

    /**
     * Son kullanım tarihi uyarılarını kontrol eder ve oluşturur
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Kontrol sonucu
     */
    async checkAndCreateExpiryAlerts(userId) {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatında
            let createdAlerts = 0;

            // 30 gün içinde son kullanım tarihi yaklaşan stoklar
            const stocks30Days = await this.stockRepository.findExpiringSoon(userId, 30);
            for (const stock of stocks30Days) {
                const exists = await this.alertRepository.existsByStockTypeAndDate(
                    stock.id,
                    '30_days',
                    today,
                    userId
                );

                if (!exists) {
                    const alertEntity = new ExpiryAlertEntity({
                        medicine_stock_id: stock.id,
                        alert_type: '30_days',
                        is_read: false,
                        user_id: userId
                    });

                    await this.alertRepository.create(alertEntity);
                    createdAlerts++;
                }
            }

            // 15 gün içinde son kullanım tarihi yaklaşan stoklar
            const stocks15Days = await this.stockRepository.findExpiringSoon(userId, 15);
            for (const stock of stocks15Days) {
                const exists = await this.alertRepository.existsByStockTypeAndDate(
                    stock.id,
                    '15_days',
                    today,
                    userId
                );

                if (!exists) {
                    const alertEntity = new ExpiryAlertEntity({
                        medicine_stock_id: stock.id,
                        alert_type: '15_days',
                        is_read: false,
                        user_id: userId
                    });

                    await this.alertRepository.create(alertEntity);
                    createdAlerts++;
                }
            }

            // 7 gün içinde son kullanım tarihi yaklaşan stoklar
            const stocks7Days = await this.stockRepository.findExpiringSoon(userId, 7);
            for (const stock of stocks7Days) {
                const exists = await this.alertRepository.existsByStockTypeAndDate(
                    stock.id,
                    '7_days',
                    today,
                    userId
                );

                if (!exists) {
                    const alertEntity = new ExpiryAlertEntity({
                        medicine_stock_id: stock.id,
                        alert_type: '7_days',
                        is_read: false,
                        user_id: userId
                    });

                    await this.alertRepository.create(alertEntity);
                    createdAlerts++;
                }
            }

            // Süresi geçmiş stoklar
            const expiredStocks = await this.stockRepository.findExpired(userId);
            for (const stock of expiredStocks) {
                const exists = await this.alertRepository.existsByStockTypeAndDate(
                    stock.id,
                    'expired',
                    today,
                    userId
                );

                if (!exists) {
                    const alertEntity = new ExpiryAlertEntity({
                        medicine_stock_id: stock.id,
                        alert_type: 'expired',
                        is_read: false,
                        user_id: userId
                    });

                    await this.alertRepository.create(alertEntity);
                    createdAlerts++;
                }
            }

            return {
                success: true,
                message: `${createdAlerts} yeni uyarı oluşturuldu`,
                details: {
                    '30_days': stocks30Days.length,
                    '15_days': stocks15Days.length,
                    '7_days': stocks7Days.length,
                    'expired': expiredStocks.length
                }
            };

        } catch (error) {
            console.error('Son kullanım tarihi kontrol hatası:', error);
            return {
                success: false,
                message: 'Son kullanım tarihi kontrol edilirken hata oluştu'
            };
        }
    }

    /**
     * Uyarı istatistiklerini getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İstatistik sonucu
     */
    async getAlertStatistics(userId) {
        try {
            const stats = await this.alertRepository.getStatisticsByUser(userId);

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            console.error('Uyarı istatistikleri getirme hatası:', error);
            return {
                success: false,
                message: 'Uyarı istatistikleri getirilemedi'
            };
        }
    }

    /**
     * Uyarı türüne göre uyarıları getirir
     * @param {string} alertType - Uyarı türü
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Uyarı listesi sonucu
     */
    async getAlertsByType(alertType, userId) {
        try {
            const validTypes = ['expired', '7_days', '15_days', '30_days'];
            if (!validTypes.includes(alertType)) {
                return {
                    success: false,
                    message: 'Geçersiz uyarı türü'
                };
            }

            const alerts = await this.alertRepository.findByType(alertType, userId);

            // DTO'ya dönüştür
            const alertDTOs = alerts.map(alert => alert.toDTO());

            return {
                success: true,
                data: alertDTOs
            };

        } catch (error) {
            console.error('Uyarı türüne göre uyarıları getirme hatası:', error);
            return {
                success: false,
                message: 'Uyarı türüne göre uyarılar getirilemedi'
            };
        }
    }

    /**
     * Stok ID'sine göre uyarıları getirir
     * @param {number} stockId - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Uyarı listesi sonucu
     */
    async getAlertsByStockId(stockId, userId) {
        try {
            const alerts = await this.alertRepository.findByStockId(stockId, userId);

            // DTO'ya dönüştür
            const alertDTOs = alerts.map(alert => alert.toDTO());

            return {
                success: true,
                data: alertDTOs
            };

        } catch (error) {
            console.error('Stok ID\'sine göre uyarıları getirme hatası:', error);
            return {
                success: false,
                message: 'Stok ID\'sine göre uyarılar getirilemedi'
            };
        }
    }

    /**
     * Stok ID'sine göre uyarıları siler
     * @param {number} stockId - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Silme sonucu
     */
    async deleteAlertsByStockId(stockId, userId) {
        try {
            const deletedCount = await this.alertRepository.deleteByStockId(stockId, userId);

            return {
                success: true,
                message: `${deletedCount} uyarı başarıyla silindi`
            };

        } catch (error) {
            console.error('Stok ID\'sine göre uyarıları silme hatası:', error);
            return {
                success: false,
                message: 'Stok ID\'sine göre uyarılar silinirken hata oluştu'
            };
        }
    }
}

module.exports = AlertService;
