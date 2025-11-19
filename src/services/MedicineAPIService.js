/**
 * Gerçek İlaç Bilgileri Servisi
 * SADECE OpenFDA API kullanır (ücretsiz, API key gerektirmez)
 * Mock/fallback data YOK
 */
const axios = require('axios');
const { db } = require('../config/database');
const turkishMedicines = require('../data/turkish-medicines.json');

class MedicineAPIService {
    constructor() {
        // OpenFDA API Endpoint
        this.openFDA = {
            baseUrl: 'https://api.fda.gov',
            drugLabel: 'drug/label.json',
            ndc: 'drug/ndc.json'
        };
        
        // Request ayarları
        this.requestTimeout = 10000; // 10 saniye
        this.rateLimitDelay = 100; // 100ms delay between requests
        this.localDataset = Array.isArray(turkishMedicines) ? turkishMedicines : [];
        this.localIndex = this.buildLocalIndex(this.localDataset);
        this.cacheAvailable = true;
        
        console.log(`🇹🇷 Türkiye ilaç veri seti yüklendi: ${this.localDataset.length} kayıt, ${this.localIndex.size} barkod eşlemesi`);
        console.log('🏥 Gerçek İlaç API Servisi başlatıldı - TR veri seti + OpenFDA API');
    }

    /**
     * Ana ilaç arama fonksiyonu - Sadece gerçek verilerle
     * @param {string} barcode - Barkod
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchMedicineByBarcode(barcode) {
        try {
            const cleanedBarcode = this.cleanBarcode(barcode);
            console.log(`🔍 Barkod araması başlatıldı: ${cleanedBarcode}`);

            const cachedResult = await this.searchInCache(cleanedBarcode);
            const localResult = this.searchInLocalDataset(cleanedBarcode);

            if (localResult) {
                console.log('🇹🇷 Türkiye veri setinden bulundu:', cleanedBarcode);

                if (!cachedResult || (cachedResult && cachedResult.source !== 'tr-dataset')) {
                    await this.saveToCache(localResult, 'tr-dataset');
                }

                return {
                    success: true,
                    data: localResult,
                    source: 'tr-dataset'
                };
            }

            if (cachedResult) {
                console.log('✅ İlaç cache\'den bulundu:', cleanedBarcode);
                return {
                    success: true,
                    data: cachedResult,
                    source: cachedResult.source || 'cache'
                };
            }
            
            // OpenFDA API'ye sor
            console.log('📡 OpenFDA API\'ye sorgu gönderiliyor...');
            const result = await this.searchOpenFDA(cleanedBarcode);
            
            if (result.success && result.data) {
                console.log('✅ OpenFDA API\'den ilaç bulundu');
                
                // Cache'e kaydet
                await this.saveToCache(result.data, result.data.source || 'openfda');
                
                return {
                    success: true,
                    data: result.data,
                    source: result.data.source || 'openfda'
                };
            }
            
            // Bulunamadı - manuel giriş gerekiyor
            console.log('❌ İlaç bulunamadı - Manuel giriş gerekiyor');
            return {
                success: false,
                message: result.message || 'Bu barkod ile Türkiye veya OpenFDA veritabanında ilaç bulunamadı. Lütfen manuel giriş yapın.',
                barcode: cleanedBarcode,
                requiresManualEntry: true
            };

        } catch (error) {
            console.error('❌ İlaç arama hatası:', error);
            return {
                success: false,
                message: 'İlaç bilgileri alınamadı: ' + error.message,
                error: error.message,
                requiresManualEntry: true
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
            const cleanedBarcode = this.cleanBarcode(barcode);
            console.log('ℹ️ Detaylı ilaç bilgisi isteniyor:', cleanedBarcode);

            const localResult = this.searchInLocalDataset(cleanedBarcode);
            if (localResult) {
                return {
                    success: true,
                    data: localResult,
                    source: 'tr-dataset',
                    additional_info: {
                        provider: 'Türkiye İlaç Veri Seti',
                        cache: false
                    }
                };
            }

            const cachedResult = await this.searchInCache(cleanedBarcode);
            if (cachedResult) {
                return {
                    success: true,
                    data: cachedResult,
                    source: cachedResult.source || 'cache',
                    additional_info: {
                        provider: cachedResult.source === 'tr-dataset'
                            ? 'Türkiye İlaç Veri Seti (Cache)'
                            : 'OpenFDA Cache',
                        cache: true
                    }
                };
            }

            const apiResult = await this.searchOpenFDA(cleanedBarcode);
            if (apiResult.success && apiResult.data) {
                await this.saveToCache(apiResult.data, apiResult.data.source || 'openfda');
                return {
                    success: true,
                    data: apiResult.data,
                    source: apiResult.data.source || 'openfda',
                    additional_info: {
                        provider: 'OpenFDA',
                        cache: false
                    }
                };
            }

            return {
                success: false,
                message: apiResult.message || 'Detaylı ilaç bilgisi bulunamadı'
            };
        } catch (error) {
            console.error('Detaylı ilaç bilgisi hatası:', error);
            return {
                success: false,
                message: 'Detaylı ilaç bilgisi alınamadı: ' + error.message
            };
        }
    }

    /**
     * OpenFDA API ile arama
     * @param {string} barcode - Barkod
     * @returns {Promise<Object>} Arama sonucu
     */
    async searchOpenFDA(barcode) {
        try {
            console.log(`🇺🇸 OpenFDA API ile aranıyor: ${barcode}`);
            
            // Rate limiting için delay
            await this.delay(this.rateLimitDelay);
            
            // OpenFDA'da NDC code ile arama
            const ndcResult = await axios.get(`${this.openFDA.baseUrl}/${this.openFDA.ndc}`, {
                params: {
                    search: `product_ndc:"${barcode}" OR package_ndc:"${barcode}"`,
                    limit: 1
                },
                timeout: this.requestTimeout,
                headers: {
                    'User-Agent': 'MedicineStorageApp/1.0',
                    'Accept': 'application/json'
                }
            });

            if (ndcResult.data && ndcResult.data.results && ndcResult.data.results.length > 0) {
                const medicine = ndcResult.data.results[0];
                console.log('✅ OpenFDA API\'sinde ilaç bulundu (NDC)');
                return {
                    success: true,
                    data: this.formatOpenFDAData(medicine, barcode)
                };
            }
            
            // UPC code ile arama (product_upc veya package_code)
            const upcResult = await axios.get(`${this.openFDA.baseUrl}/${this.openFDA.ndc}`, {
                params: {
                    search: `product_upc:"${barcode}" OR package_code:"${barcode}"`,
                    limit: 1
                },
                timeout: this.requestTimeout,
                headers: {
                    'User-Agent': 'MedicineStorageApp/1.0',
                    'Accept': 'application/json'
                }
            });

            if (upcResult.data && upcResult.data.results && upcResult.data.results.length > 0) {
                const medicine = upcResult.data.results[0];
                console.log('✅ OpenFDA API\'sinde ilaç bulundu (UPC)');
                return {
                    success: true,
                    data: this.formatOpenFDAData(medicine, barcode)
                };
            }
            
            return {
                success: false,
                message: 'OpenFDA API\'sinde bulunamadı'
            };
            
        } catch (error) {
            console.log('OpenFDA API arama hatası:', error.message);
            return {
                success: false,
                message: 'OpenFDA API arama hatası: ' + error.message
            };
        }
    }

    /**
     * OpenFDA verilerini formatla
     * @param {Object} data - OpenFDA API verisi
     * @param {string} barcode - Orijinal barkod
     * @returns {Object} Formatlanmış veri
     */
    formatOpenFDAData(data, barcode) {
        const normalized = this.normalizeMedicineData({
            barcode,
            name: data.product_name || data.brand_name || data.generic_name || 'Bilinmeyen İlaç',
            active_ingredient: data.active_ingredient || data.substance_name || '',
            manufacturer: data.labeler_name || data.product_type || '',
            dosage_form: data.dosage_form || '',
            strength: data.strength || '',
            package_size: data.package_size || '',
            description: data.description || '',
            country: 'US',
            source: 'openfda',
            prescription_required: false,
            storage_conditions: []
        });

        return {
            ...normalized,
            openFDAId: data.product_id || null,
            ndcCode: data.product_ndc || data.package_ndc || ''
        };
    }

    /**
     * Veritabanı cache'de ara
     * @param {string} barcode - Barkod
     * @returns {Promise<Object|null>} Cache'den ilaç verisi veya null
     */
    async searchInCache(barcode) {
        if (!this.cacheAvailable) return null;

        try {
            const cached = await db.query(`
                SELECT * FROM medicine_cache WHERE barcode = ?
            `, [barcode]);
            
            if (cached.length > 0) {
                return this.mapCacheToMedicine(cached[0]);
            }
            
            return null;
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                this.cacheAvailable = false;
                console.warn('⚠️ medicine_cache tablosu bulunamadı. Cache işlemleri devre dışı bırakıldı.');
                return null;
            }
            console.error('Cache arama hatası:', error);
            return null;
        }
    }

    /**
     * Cache'e kaydet
     * @param {Object} medicineData - İlaç verisi
     * @returns {Promise<void>}
     */
    async saveToCache(medicineData, source = 'openfda') {
        if (!this.cacheAvailable) return;

        try {
            const normalized = this.normalizeMedicineData({ ...medicineData, source });

            if (!normalized.barcode) {
                console.warn('⚠️ Cache kaydı için geçersiz barkod verisi alındı.');
                return;
            }

            await db.query(`
                INSERT INTO medicine_cache 
                (barcode, name, active_ingredient, manufacturer, dosage_form, strength, package_size, description, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    active_ingredient = VALUES(active_ingredient),
                    manufacturer = VALUES(manufacturer),
                    dosage_form = VALUES(dosage_form),
                    strength = VALUES(strength),
                    package_size = VALUES(package_size),
                    description = VALUES(description),
                    source = VALUES(source),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                normalized.barcode,
                normalized.name || '',
                normalized.active_ingredient || '',
                normalized.manufacturer || '',
                normalized.dosage_form || '',
                normalized.strength || '',
                normalized.package_size || '',
                normalized.description || '',
                source
            ]);
            
            console.log(`✅ İlaç cache'e kaydedildi (${source})`);
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                this.cacheAvailable = false;
                console.warn('⚠️ medicine_cache tablosu bulunamadı. Cache işlemleri devre dışı bırakıldı.');
                return;
            }
            console.error('Cache kaydetme hatası:', error);
        }
    }

    /**
     * Manuel olarak girilen ilaçları cache'e kaydet
     * @param {Object} medicineData - İlaç verisi
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<void>}
     */
    async saveManualToCache(medicineData, userId) {
        if (!this.cacheAvailable) return;

        try {
            const normalized = this.normalizeMedicineData({ ...medicineData, source: 'manual' });

            if (!normalized.barcode) {
                console.warn('⚠️ Manuel cache kaydı için geçersiz barkod verisi alındı.');
                return;
            }

            await db.query(`
                INSERT INTO medicine_cache 
                (barcode, name, active_ingredient, manufacturer, dosage_form, strength, package_size, description, source, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual', ?)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    active_ingredient = VALUES(active_ingredient),
                    manufacturer = VALUES(manufacturer),
                    dosage_form = VALUES(dosage_form),
                    strength = VALUES(strength),
                    package_size = VALUES(package_size),
                    description = VALUES(description),
                    source = VALUES(source),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                normalized.barcode,
                normalized.name || '',
                normalized.active_ingredient || '',
                normalized.manufacturer || '',
                normalized.dosage_form || '',
                normalized.strength || '',
                normalized.package_size || '',
                normalized.description || '',
                userId
            ]);
            
            console.log('✅ Manuel ilaç cache\'e kaydedildi');
        } catch (error) {
            if (error.code === 'ER_NO_SUCH_TABLE') {
                this.cacheAvailable = false;
                console.warn('⚠️ medicine_cache tablosu bulunamadı. Cache işlemleri devre dışı bırakıldı.');
                return;
            }
            console.error('Manuel cache kaydetme hatası:', error);
        }
    }

    buildLocalIndex(dataset = []) {
        const index = new Map();

        dataset.forEach(item => {
            const normalized = this.normalizeMedicineData({
                ...item,
                barcode: this.cleanBarcode(item.barcode),
                source: 'tr-dataset',
                country: item.country || 'TR'
            });

            if (!normalized.barcode) {
                return;
            }

            index.set(normalized.barcode, normalized);

            if (normalized.barcode.length === 13) {
                index.set(`0${normalized.barcode}`, normalized);
                index.set(normalized.barcode.slice(1), normalized);
            } else if (normalized.barcode.length === 14 && normalized.barcode.startsWith('0')) {
                index.set(normalized.barcode.slice(1), normalized);
            }
        });

        return index;
    }

    searchInLocalDataset(barcode) {
        if (!barcode || !this.localIndex) return null;

        const cleaned = this.cleanBarcode(barcode);
        if (!cleaned) return null;

        const entry = this.localIndex.get(cleaned);
        if (!entry) return null;

        const normalized = this.normalizeMedicineData(entry);
        normalized.source = 'tr-dataset';
        normalized.country = normalized.country || 'TR';
        return normalized;
    }

    normalizeMedicineData(data = {}) {
        if (!data) return {};

        const cleanedBarcode = this.cleanBarcode(data.barcode);
        const storageRaw = data.storage_conditions || data.storageConditions || [];
        const storageConditions = Array.isArray(storageRaw)
            ? storageRaw.map(item => String(item))
            : [];

        const prescriptionNormalized = typeof data.prescription_required === 'boolean'
            ? data.prescription_required
            : typeof data.prescriptionRequired === 'boolean'
                ? data.prescriptionRequired
                : false;

        const normalized = {
            barcode: cleanedBarcode || null,
            name: data.name ? String(data.name).trim() : null,
            active_ingredient: data.active_ingredient || data.activeIngredient || null,
            activeIngredient: data.active_ingredient || data.activeIngredient || null,
            manufacturer: data.manufacturer || null,
            dosage_form: data.dosage_form || data.dosageForm || null,
            dosageForm: data.dosage_form || data.dosageForm || null,
            strength: data.strength || null,
            package_size: data.package_size || data.packageSize || null,
            packageSize: data.package_size || data.packageSize || null,
            description: data.description || null,
            country: data.country || data.origin_country || (cleanedBarcode && cleanedBarcode.startsWith('869') ? 'TR' : null),
            prescription_required: prescriptionNormalized,
            prescriptionRequired: prescriptionNormalized,
            storage_conditions: storageConditions,
            storageConditions: storageConditions,
            source: data.source || data.dataset_source || data.origin || null
        };

        if (!normalized.country && typeof data.country === 'string') {
            normalized.country = data.country;
        }

        return normalized;
    }

    /**
     * Cache verisini medicine formatına map et
     * @param {Object} cachedData - Cache verisi
     * @returns {Object} Medicine formatı
     */
    mapCacheToMedicine(cachedData) {
        if (!cachedData) return null;
        return this.normalizeMedicineData({
            ...cachedData,
            source: cachedData.source || 'cache'
        });
    }

    // Yardımcı fonksiyonlar
    cleanBarcode(barcode) {
        if (!barcode) return '';
        return barcode.toString().replace(/[^0-9]/g, '');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MedicineAPIService;
