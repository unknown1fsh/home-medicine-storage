/**
 * İlaç Servisi
 * İlaç iş mantığını yönetir
 */
const MedicineRepository = require('../repositories/MedicineRepository');
const MedicineDTO = require('../dto/MedicineDTO');
const CreateMedicineDTO = require('../dto/CreateMedicineDTO');
const UpdateMedicineDTO = require('../dto/UpdateMedicineDTO');
const MedicineAPIService = require('./MedicineAPIService');

class MedicineService {
    constructor() {
        this.medicineRepository = new MedicineRepository();
        this.medicineAPIService = new MedicineAPIService();
    }

    /**
     * Tüm ilaçları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İlaç listesi sonucu
     */
    async getAllMedicines(userId) {
        try {
            const medicines = await this.medicineRepository.findAll(userId);

            // DTO'ya dönüştür
            const medicineDTOs = medicines.map(medicine => medicine.toDTO());

            return {
                success: true,
                data: medicineDTOs
            };

        } catch (error) {
            console.error('İlaçları getirme hatası:', error);
            return {
                success: false,
                message: 'İlaçlar getirilemedi'
            };
        }
    }

    /**
     * ID'ye göre ilaç getirir
     * @param {number} id - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İlaç sonucu
     */
    async getMedicineById(id, userId) {
        try {
            const medicine = await this.medicineRepository.findById(id, userId);

            if (!medicine) {
                return {
                    success: false,
                    message: 'İlaç bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const medicineDTO = medicine.toDTO();

            return {
                success: true,
                data: medicineDTO
            };

        } catch (error) {
            console.error('İlaç getirme hatası:', error);
            return {
                success: false,
                message: 'İlaç getirilemedi'
            };
        }
    }

    /**
     * Barkod ile ilaç arar
     * @param {string} barcode - Barkod
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchMedicineByBarcode(barcode, userId) {
        try {
            // Önce veritabanında ara
            const existingMedicine = await this.medicineRepository.findByBarcode(barcode, userId);

            if (existingMedicine) {
                const medicineDTO = existingMedicine.toDTO();
                return {
                    success: true,
                    data: medicineDTO,
                    source: 'database'
                };
            }

            // Veritabanında yoksa API'den çek
            console.log('Veritabanında bulunamadı, API\'den çekiliyor:', barcode);
            
            const apiResult = await this.medicineAPIService.searchMedicineByBarcode(barcode);

            if (apiResult.success) {
                const medicineData = apiResult.data;

                // API'den gelen veriyi veritabanına kaydet
                const createMedicineDTO = new CreateMedicineDTO({
                    barcode: barcode,
                    name: medicineData.name,
                    activeIngredient: medicineData.active_ingredient,
                    manufacturer: medicineData.manufacturer,
                    dosageForm: medicineData.dosage_form,
                    strength: medicineData.strength,
                    packageSize: medicineData.package_size,
                    description: medicineData.description,
                    userId: userId
                });

                const createdMedicine = await this.createMedicine(createMedicineDTO);

                if (createdMedicine.success) {
                    return {
                        success: true,
                        data: createdMedicine.data,
                        source: apiResult.source,
                        api_info: {
                            country: medicineData.country,
                            prescription_required: medicineData.prescription_required,
                            storage_conditions: medicineData.storage_conditions || null
                        }
                    };
                }
            }

            return {
                success: false,
                message: apiResult.message || 'Barkod ile ilaç bulunamadı'
            };

        } catch (error) {
            console.error('Barkod arama hatası:', error);
            return {
                success: false,
                message: 'Barkod arama sırasında hata oluştu'
            };
        }
    }

    /**
     * Detaylı ilaç bilgisi getirir
     * @param {string} barcode - Barkod
     * @returns {Promise<Object>} Detaylı bilgi sonucu
     */
    async getDetailedMedicineInfo(barcode) {
        try {
            console.log('Detaylı ilaç bilgisi isteniyor:', barcode);

            const detailedInfo = await this.medicineAPIService.getDetailedMedicineInfo(barcode);

            if (detailedInfo.success) {
                return {
                    success: true,
                    data: detailedInfo.data,
                    source: detailedInfo.source,
                    additional_info: detailedInfo.additional_info
                };
            } else {
                return {
                    success: false,
                    message: detailedInfo.message || 'Detaylı ilaç bilgisi bulunamadı'
                };
            }

        } catch (error) {
            console.error('Detaylı ilaç bilgisi hatası:', error);
            return {
                success: false,
                message: 'Detaylı ilaç bilgisi alınırken hata oluştu'
            };
        }
    }

    /**
     * Yeni ilaç oluşturur
     * @param {CreateMedicineDTO} createMedicineDTO - İlaç oluşturma DTO'su
     * @returns {Promise<Object>} Oluşturma sonucu
     */
    async createMedicine(createMedicineDTO) {
        try {
            // DTO validasyonu
            const validation = createMedicineDTO.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validasyon hatası',
                    errors: validation.errors
                };
            }

            // Barkod benzersizlik kontrolü
            const isUnique = await this.medicineRepository.isBarcodeUnique(
                createMedicineDTO.barcode,
                createMedicineDTO.userId
            );

            if (!isUnique) {
                return {
                    success: false,
                    message: 'Bu barkod zaten kayıtlı'
                };
            }

            // İlaç entity'sini oluştur
            const medicineEntity = createMedicineDTO.toEntity();

            // İlacı kaydet
            const createdMedicine = await this.medicineRepository.create(medicineEntity);

            // DTO'ya dönüştür
            const medicineDTO = createdMedicine.toDTO();

            return {
                success: true,
                data: medicineDTO,
                message: 'İlaç başarıyla eklendi'
            };

        } catch (error) {
            console.error('İlaç ekleme hatası:', error);
            return {
                success: false,
                message: 'İlaç eklenirken hata oluştu'
            };
        }
    }

    /**
     * İlaç bilgilerini günceller
     * @param {number} id - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @param {UpdateMedicineDTO} updateMedicineDTO - İlaç güncelleme DTO'su
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async updateMedicine(id, userId, updateMedicineDTO) {
        try {
            // DTO validasyonu
            const validation = updateMedicineDTO.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validasyon hatası',
                    errors: validation.errors
                };
            }

            // Güncelleme var mı kontrol et
            if (!updateMedicineDTO.hasUpdates()) {
                return {
                    success: false,
                    message: 'Güncellenecek alan bulunamadı'
                };
            }

            // Veritabanı formatına dönüştür
            const updateData = updateMedicineDTO.toDatabaseUpdateFormat();

            // İlacı güncelle
            const updatedMedicine = await this.medicineRepository.update(id, userId, updateData);

            if (!updatedMedicine) {
                return {
                    success: false,
                    message: 'İlaç bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const medicineDTO = updatedMedicine.toDTO();

            return {
                success: true,
                data: medicineDTO,
                message: 'İlaç başarıyla güncellendi'
            };

        } catch (error) {
            console.error('İlaç güncelleme hatası:', error);
            return {
                success: false,
                message: 'İlaç güncellenirken hata oluştu'
            };
        }
    }

    /**
     * İlacı siler
     * @param {number} id - İlaç ID'si
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Silme sonucu
     */
    async deleteMedicine(id, userId) {
        try {
            // İlacın stokları var mı kontrol et
            const hasStocks = await this.medicineRepository.hasStocks(id, userId);

            if (hasStocks) {
                return {
                    success: false,
                    message: 'Bu ilacın stokları mevcut. Önce stokları silin.'
                };
            }

            // İlacı sil
            const deleted = await this.medicineRepository.delete(id, userId);

            if (!deleted) {
                return {
                    success: false,
                    message: 'İlaç bulunamadı'
                };
            }

            return {
                success: true,
                message: 'İlaç başarıyla silindi'
            };

        } catch (error) {
            console.error('İlaç silme hatası:', error);
            return {
                success: false,
                message: 'İlaç silinirken hata oluştu'
            };
        }
    }

    /**
     * İlaç adına göre arama yapar
     * @param {string} name - İlaç adı
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchMedicinesByName(name, userId) {
        try {
            const medicines = await this.medicineRepository.findByName(name, userId);

            // DTO'ya dönüştür
            const medicineDTOs = medicines.map(medicine => medicine.toDTO());

            return {
                success: true,
                data: medicineDTOs
            };

        } catch (error) {
            console.error('İlaç adı ile arama hatası:', error);
            return {
                success: false,
                message: 'İlaç araması yapılamadı'
            };
        }
    }

    /**
     * Etken maddeye göre arama yapar
     * @param {string} activeIngredient - Etken madde
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchMedicinesByActiveIngredient(activeIngredient, userId) {
        try {
            const medicines = await this.medicineRepository.findByActiveIngredient(activeIngredient, userId);

            // DTO'ya dönüştür
            const medicineDTOs = medicines.map(medicine => medicine.toDTO());

            return {
                success: true,
                data: medicineDTOs
            };

        } catch (error) {
            console.error('Etken madde ile arama hatası:', error);
            return {
                success: false,
                message: 'İlaç araması yapılamadı'
            };
        }
    }

    /**
     * Yaklaşan son kullanım tarihli ilaçları getirir
     * @param {number} userId - Kullanıcı ID'si
     * @param {number} days - Kaç gün içinde (varsayılan: 30)
     * @returns {Promise<Object>} İlaç listesi sonucu
     */
    async getExpiringMedicines(userId, days = 30) {
        try {
            const medicines = await this.medicineRepository.findExpiringSoon(userId, days);

            // DTO'ya dönüştür
            const medicineDTOs = medicines.map(medicine => medicine.toDTO());

            return {
                success: true,
                data: medicineDTOs
            };

        } catch (error) {
            console.error('Yaklaşan son kullanım tarihli ilaçları getirme hatası:', error);
            return {
                success: false,
                message: 'Yaklaşan son kullanım tarihli ilaçlar getirilemedi'
            };
        }
    }

    /**
     * İlaç istatistiklerini getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} İstatistik sonucu
     */
    async getMedicineStatistics(userId) {
        try {
            const stats = await this.medicineRepository.getStatisticsByUser(userId);

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            console.error('İlaç istatistikleri getirme hatası:', error);
            return {
                success: false,
                message: 'İlaç istatistikleri getirilemedi'
            };
        }
    }

    /**
     * İlaç API cache'ini temizler
     * @returns {Promise<Object>} Cache temizleme sonucu
     */
    async clearMedicineAPICache() {
        try {
            this.medicineAPIService.clearCache();

            return {
                success: true,
                message: 'İlaç API cache temizlendi'
            };

        } catch (error) {
            console.error('Cache temizleme hatası:', error);
            return {
                success: false,
                message: 'Cache temizlenirken hata oluştu'
            };
        }
    }
}

module.exports = MedicineService;
