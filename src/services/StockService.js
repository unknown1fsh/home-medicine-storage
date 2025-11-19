/**
 * İlaç Stoku Servisi
 * İlaç stoku iş mantığını yönetir
 */
const StockRepository = require('../repositories/StockRepository');
const MedicineRepository = require('../repositories/MedicineRepository');
const StockDTO = require('../dto/StockDTO');
const CreateStockDTO = require('../dto/CreateStockDTO');
const UpdateStockDTO = require('../dto/UpdateStockDTO');

class StockService {
    constructor() {
        this.stockRepository = new StockRepository();
        this.medicineRepository = new MedicineRepository();
    }

    /**
     * Tüm stokları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Stok listesi sonucu
     */
    async getAllStocks(userId) {
        try {
            const stocks = await this.stockRepository.findAll(userId);

            // DTO'ya dönüştür
            const stockDTOs = stocks.map(stock => stock.toDTO());

            return {
                success: true,
                data: stockDTOs
            };

        } catch (error) {
            console.error('Stokları getirme hatası:', error);
            return {
                success: false,
                message: 'Stoklar getirilemedi'
            };
        }
    }

    /**
     * ID'ye göre stok getirir
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Stok sonucu
     */
    async getStockById(id, userId) {
        try {
            const stock = await this.stockRepository.findById(id, userId);

            if (!stock) {
                return {
                    success: false,
                    message: 'Stok bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const stockDTO = stock.toDTO();

            return {
                success: true,
                data: stockDTO
            };

        } catch (error) {
            console.error('Stok getirme hatası:', error);
            return {
                success: false,
                message: 'Stok getirilemedi'
            };
        }
    }

    /**
     * Belirli bir ilacın stoklarını getirir
     * @param {number} medicineId - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Stok listesi sonucu
     */
    async getStocksByMedicineId(medicineId, userId) {
        try {
            const stocks = await this.stockRepository.findByMedicineId(medicineId, userId);

            // DTO'ya dönüştür
            const stockDTOs = stocks.map(stock => stock.toDTO());

            return {
                success: true,
                data: stockDTOs
            };

        } catch (error) {
            console.error('İlaç stokları getirme hatası:', error);
            return {
                success: false,
                message: 'İlaç stokları getirilemedi'
            };
        }
    }

    /**
     * Yeni stok oluşturur
     * @param {CreateStockDTO} createStockDTO - Stok oluşturma DTO'su
     * @returns {Promise<Object>} Oluşturma sonucu
     */
    async createStock(createStockDTO) {
        try {
            // DTO validasyonu
            const validation = createStockDTO.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validasyon hatası',
                    errors: validation.errors
                };
            }

            // Tarih tutarlılık kontrolü
            const dateValidation = createStockDTO.validateDateConsistency();
            if (!dateValidation.isValid) {
                return {
                    success: false,
                    message: 'Tarih tutarlılık hatası',
                    errors: dateValidation.errors
                };
            }

            // İlaç var mı kontrol et
            const medicine = await this.medicineRepository.findById(createStockDTO.medicineId, createStockDTO.userId);

            if (!medicine) {
                return {
                    success: false,
                    message: 'İlaç bulunamadı'
                };
            }

            // Stok entity'sini oluştur
            const stockEntity = createStockDTO.toEntity();

            // Stoku kaydet
            const createdStock = await this.stockRepository.create(stockEntity);

            // DTO'ya dönüştür
            const stockDTO = createdStock.toDTO();

            return {
                success: true,
                data: stockDTO,
                message: 'Stok başarıyla eklendi'
            };

        } catch (error) {
            console.error('Stok ekleme hatası:', error);
            return {
                success: false,
                message: 'Stok eklenirken hata oluştu'
            };
        }
    }

    /**
     * Stok bilgilerini günceller
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {UpdateStockDTO} updateStockDTO - Stok güncelleme DTO'su
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async updateStock(id, userId, updateStockDTO) {
        try {
            // DTO validasyonu
            const validation = updateStockDTO.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validasyon hatası',
                    errors: validation.errors
                };
            }

            // Güncelleme var mı kontrol et
            if (!updateStockDTO.hasUpdates()) {
                return {
                    success: false,
                    message: 'Güncellenecek alan bulunamadı'
                };
            }

            // Tarih tutarlılık kontrolü
            const dateValidation = updateStockDTO.validateDateConsistency();
            if (!dateValidation.isValid) {
                return {
                    success: false,
                    message: 'Tarih tutarlılık hatası',
                    errors: dateValidation.errors
                };
            }

            // Veritabanı formatına dönüştür
            const updateData = updateStockDTO.toDatabaseUpdateFormat();

            // Stoku güncelle
            const updatedStock = await this.stockRepository.update(id, userId, updateData);

            if (!updatedStock) {
                return {
                    success: false,
                    message: 'Stok bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const stockDTO = updatedStock.toDTO();

            return {
                success: true,
                data: stockDTO,
                message: 'Stok başarıyla güncellendi'
            };

        } catch (error) {
            console.error('Stok güncelleme hatası:', error);
            return {
                success: false,
                message: 'Stok güncellenirken hata oluştu'
            };
        }
    }

    /**
     * Stoku siler
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Silme sonucu
     */
    async deleteStock(id, userId) {
        try {
            const deleted = await this.stockRepository.delete(id, userId);

            if (!deleted) {
                return {
                    success: false,
                    message: 'Stok bulunamadı'
                };
            }

            return {
                success: true,
                message: 'Stok başarıyla silindi'
            };

        } catch (error) {
            console.error('Stok silme hatası:', error);
            return {
                success: false,
                message: 'Stok silinirken hata oluştu'
            };
        }
    }

    /**
     * Yaklaşan son kullanım tarihli stokları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} days - Kaç gün içinde
     * @returns {Promise<Object>} Stok listesi sonucu
     */
    async getExpiringStocks(userId, days) {
        try {
            if (isNaN(days) || days < 0) {
                return {
                    success: false,
                    message: 'Geçerli bir gün sayısı giriniz'
                };
            }

            const stocks = await this.stockRepository.findExpiringSoon(userId, days);

            // DTO'ya dönüştür
            const stockDTOs = stocks.map(stock => stock.toDTO());

            return {
                success: true,
                data: stockDTOs,
                message: `${days} gün içinde son kullanım tarihi yaklaşan ${stocks.length} stok bulundu`
            };

        } catch (error) {
            console.error('Yaklaşan son kullanım tarihli stokları getirme hatası:', error);
            return {
                success: false,
                message: 'Yaklaşan son kullanım tarihli stoklar getirilemedi'
            };
        }
    }

    /**
     * Süresi geçmiş stokları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Stok listesi sonucu
     */
    async getExpiredStocks(userId) {
        try {
            const stocks = await this.stockRepository.findExpired(userId);

            // DTO'ya dönüştür
            const stockDTOs = stocks.map(stock => stock.toDTO());

            return {
                success: true,
                data: stockDTOs
            };

        } catch (error) {
            console.error('Süresi geçmiş stokları getirme hatası:', error);
            return {
                success: false,
                message: 'Süresi geçmiş stoklar getirilemedi'
            };
        }
    }

    /**
     * Konuma göre stokları getirir
     * @param {string} location - Konum
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Stok listesi sonucu
     */
    async getStocksByLocation(location, userId) {
        try {
            const stocks = await this.stockRepository.findByLocation(location, userId);

            // DTO'ya dönüştür
            const stockDTOs = stocks.map(stock => stock.toDTO());

            return {
                success: true,
                data: stockDTOs
            };

        } catch (error) {
            console.error('Konuma göre stokları getirme hatası:', error);
            return {
                success: false,
                message: 'Konuma göre stoklar getirilemedi'
            };
        }
    }

    /**
     * Stok miktarını günceller
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} quantity - Yeni miktar
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async updateStockQuantity(id, userId, quantity) {
        try {
            if (!Number.isInteger(quantity) || quantity < 0) {
                return {
                    success: false,
                    message: 'Geçersiz miktar'
                };
            }

            const updatedStock = await this.stockRepository.updateQuantity(id, userId, quantity);

            if (!updatedStock) {
                return {
                    success: false,
                    message: 'Stok bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const stockDTO = updatedStock.toDTO();

            return {
                success: true,
                data: stockDTO,
                message: 'Stok miktarı başarıyla güncellendi'
            };

        } catch (error) {
            console.error('Stok miktarı güncelleme hatası:', error);
            return {
                success: false,
                message: 'Stok miktarı güncellenirken hata oluştu'
            };
        }
    }

    /**
     * Stok miktarını azaltır
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} amount - Azaltılacak miktar
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async decreaseStockQuantity(id, userId, amount) {
        try {
            if (!Number.isInteger(amount) || amount <= 0) {
                return {
                    success: false,
                    message: 'Geçersiz miktar'
                };
            }

            const updatedStock = await this.stockRepository.decreaseQuantity(id, userId, amount);

            if (!updatedStock) {
                return {
                    success: false,
                    message: 'Stok bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const stockDTO = updatedStock.toDTO();

            return {
                success: true,
                data: stockDTO,
                message: 'Stok miktarı başarıyla azaltıldı'
            };

        } catch (error) {
            console.error('Stok miktarı azaltma hatası:', error);
            return {
                success: false,
                message: 'Stok miktarı azaltılırken hata oluştu'
            };
        }
    }

    /**
     * Stok miktarını artırır
     * @param {number} id - Stok ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} amount - Artırılacak miktar
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async increaseStockQuantity(id, userId, amount) {
        try {
            if (!Number.isInteger(amount) || amount <= 0) {
                return {
                    success: false,
                    message: 'Geçersiz miktar'
                };
            }

            const updatedStock = await this.stockRepository.increaseQuantity(id, userId, amount);

            if (!updatedStock) {
                return {
                    success: false,
                    message: 'Stok bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const stockDTO = updatedStock.toDTO();

            return {
                success: true,
                data: stockDTO,
                message: 'Stok miktarı başarıyla artırıldı'
            };

        } catch (error) {
            console.error('Stok miktarı artırma hatası:', error);
            return {
                success: false,
                message: 'Stok miktarı artırılırken hata oluştu'
            };
        }
    }

    /**
     * Stok istatistiklerini getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İstatistik sonucu
     */
    async getStockStatistics(userId) {
        try {
            const stats = await this.stockRepository.getStatisticsByUser(userId);

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            console.error('Stok istatistikleri getirme hatası:', error);
            return {
                success: false,
                message: 'Stok istatistikleri getirilemedi'
            };
        }
    }
}

module.exports = StockService;
