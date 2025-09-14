// İlaç bilgileri API servisi
const axios = require('axios');
const config = require('../config');

class MedicineAPIService {
    constructor() {
        this.openFDABaseUrl = 'https://api.fda.gov/drug/ndc.json';
        this.turkishAPIBaseUrl = 'https://api.titck.gov.tr/ilac'; // Örnek URL
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 saat
    }

    // Ana ilaç arama fonksiyonu
    async searchMedicineByBarcode(barcode) {
        try {
            // Önce cache'de ara
            const cachedResult = this.getFromCache(barcode);
            if (cachedResult) {
                console.log('İlaç bilgisi cache\'den alındı:', barcode);
                return cachedResult;
            }

            // Türkiye API'sini dene
            let result = await this.searchTurkishAPI(barcode);
            
            // Türkiye API'si başarısızsa OpenFDA'yı dene
            if (!result || !result.success) {
                console.log('Türkiye API başarısız, OpenFDA deneniyor:', barcode);
                result = await this.searchOpenFDA(barcode);
            }

            // Sonuç bulunduysa cache'e kaydet
            if (result && result.success) {
                this.saveToCache(barcode, result);
            }

            return result;

        } catch (error) {
            console.error('İlaç arama hatası:', error);
            return {
                success: false,
                message: 'İlaç bilgileri alınamadı',
                error: error.message
            };
        }
    }

    // Türkiye İlaç API'si
    async searchTurkishAPI(barcode) {
        try {
            // TİTCK API'si için örnek implementasyon
            // Gerçek API endpoint'i ve authentication gerekebilir
            
            const response = await axios.get(`${this.turkishAPIBaseUrl}/search`, {
                params: {
                    barcode: barcode,
                    format: 'json'
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'MedicineStorageApp/1.0',
                    'Accept': 'application/json'
                }
            });

            if (response.data && response.data.length > 0) {
                const medicine = response.data[0];
                return this.formatTurkishMedicineData(medicine);
            }

            return { success: false, message: 'Türkiye API\'sinde ilaç bulunamadı' };

        } catch (error) {
            console.log('Türkiye API hatası:', error.message);
            return { success: false, message: 'Türkiye API erişilemedi' };
        }
    }

    // OpenFDA API
    async searchOpenFDA(barcode) {
        try {
            const response = await axios.get(this.openFDABaseUrl, {
                params: {
                    search: `product_ndc:"${barcode}"`,
                    limit: 1
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'MedicineStorageApp/1.0'
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                const medicine = response.data.results[0];
                return this.formatOpenFDAMedicineData(medicine);
            }

            return { success: false, message: 'OpenFDA\'da ilaç bulunamadı' };

        } catch (error) {
            console.log('OpenFDA hatası:', error.message);
            return { success: false, message: 'OpenFDA erişilemedi' };
        }
    }

    // Türkiye API verisini formatla
    formatTurkishMedicineData(data) {
        return {
            success: true,
            source: 'turkish_api',
            data: {
                barcode: data.barkod || data.barcode,
                name: data.ilac_adi || data.name,
                active_ingredient: data.etken_madde || data.active_ingredient,
                manufacturer: data.uretici_firma || data.manufacturer,
                dosage_form: data.dozaj_formu || data.dosage_form,
                strength: data.guclu || data.strength,
                package_size: data.paket_boyutu || data.package_size,
                description: data.aciklama || data.description,
                atc_code: data.atc_kodu || data.atc_code,
                prescription_required: data.recete_gerekli || data.prescription_required,
                price: data.fiyat || data.price,
                country: 'TR'
            }
        };
    }

    // OpenFDA verisini formatla
    formatOpenFDAMedicineData(data) {
        return {
            success: true,
            source: 'openfda',
            data: {
                barcode: data.product_ndc || data.ndc,
                name: data.generic_name || data.brand_name || 'Bilinmeyen İlaç',
                active_ingredient: data.active_ingredient || null,
                manufacturer: data.manufacturer_name || data.labeler_name || null,
                dosage_form: data.dosage_form || null,
                strength: data.strength || null,
                package_size: data.package_ndc || null,
                description: data.description || null,
                atc_code: data.atc_code || null,
                prescription_required: data.prescription_required || null,
                price: null,
                country: 'US'
            }
        };
    }

    // Cache işlemleri
    getFromCache(barcode) {
        const cached = this.cache.get(barcode);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    saveToCache(barcode, data) {
        this.cache.set(barcode, {
            data: data,
            timestamp: Date.now()
        });
    }

    // Cache temizleme
    clearCache() {
        this.cache.clear();
    }

    // İlaç bilgilerini detaylandır
    async getDetailedMedicineInfo(barcode) {
        try {
            const basicInfo = await this.searchMedicineByBarcode(barcode);
            
            if (!basicInfo.success) {
                return basicInfo;
            }

            // Ek bilgiler için başka API'ler çağrılabilir
            const detailedInfo = {
                ...basicInfo,
                additional_info: {
                    side_effects: await this.getSideEffects(basicInfo.data.name),
                    interactions: await this.getInteractions(basicInfo.data.active_ingredient),
                    storage_conditions: this.getStorageConditions(basicInfo.data),
                    usage_instructions: this.getUsageInstructions(basicInfo.data)
                }
            };

            return detailedInfo;

        } catch (error) {
            console.error('Detaylı ilaç bilgisi hatası:', error);
            return basicInfo; // Temel bilgiyi döndür
        }
    }

    // Yan etkiler (örnek implementasyon)
    async getSideEffects(medicineName) {
        // Bu fonksiyon başka bir API'den yan etkileri çekebilir
        return null;
    }

    // Etkileşimler (örnek implementasyon)
    async getInteractions(activeIngredient) {
        // Bu fonksiyon başka bir API'den etkileşimleri çekebilir
        return null;
    }

    // Saklama koşulları
    getStorageConditions(medicineData) {
        const conditions = [];
        
        if (medicineData.dosage_form) {
            if (medicineData.dosage_form.toLowerCase().includes('tablet')) {
                conditions.push('Oda sıcaklığında saklayın');
            }
            if (medicineData.dosage_form.toLowerCase().includes('syrup')) {
                conditions.push('Buzdolabında saklayın');
            }
        }

        return conditions.length > 0 ? conditions : ['Oda sıcaklığında saklayın'];
    }

    // Kullanım talimatları
    getUsageInstructions(medicineData) {
        const instructions = [];
        
        if (medicineData.prescription_required) {
            instructions.push('Reçeteli ilaç - Doktor kontrolünde kullanın');
        }
        
        if (medicineData.dosage_form) {
            if (medicineData.dosage_form.toLowerCase().includes('tablet')) {
                instructions.push('Yemeklerden sonra alın');
            }
        }

        return instructions.length > 0 ? instructions : ['Doktor tavsiyesine göre kullanın'];
    }
}

module.exports = MedicineAPIService;
