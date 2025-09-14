// Evdeki İlaç Depom - Ana JavaScript Uygulaması
class MedicineStorageApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentSection = 'dashboard';
        this.scanner = null;
        this.user = null;
        this.init();
    }

    async init() {
        try {
            // Authentication kontrolü
            if (!this.checkAuth()) {
                console.log('Authentication failed, redirecting to login');
                window.location.href = '/';
                return;
            }

            console.log('Authentication successful, setting up interface');
            this.setupUserInterface();
            await this.loadDashboard();
            this.setupEventListeners();
            this.startPeriodicChecks();
        } catch (error) {
            console.error('App initialization error:', error);
            this.showAlert('Uygulama başlatılırken hata oluştu', 'danger');
        }
    }

    checkAuth() {
        try {
            const token = localStorage.getItem('authToken');
            const user = localStorage.getItem('user');
            
            if (!token || !user) {
                console.log('No token or user data found');
                return false;
            }
            
            // Token'ın geçerliliğini kontrol et (basit kontrol)
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                console.log('Invalid token format');
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                return false;
            }
            
            try {
                this.user = JSON.parse(user);
                console.log('User data loaded:', this.user.username);
                return true;
            } catch (parseError) {
                console.error('User data parse error:', parseError);
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                return false;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            return false;
        }
    }

    setupUserInterface() {
        try {
            // Kullanıcı adını göster
            const userNameElement = document.getElementById('userName');
            if (userNameElement && this.user) {
                userNameElement.textContent = this.user.firstName + ' ' + this.user.lastName;
            }
            
            // Admin menüsünü göster/gizle
            const adminNavItem = document.getElementById('adminNavItem');
            if (adminNavItem) {
                if (this.user && this.user.role === 'admin') {
                    adminNavItem.style.display = 'block';
                } else {
                    adminNavItem.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Setup user interface error:', error);
        }
    }

    setupEventListeners() {
        // Navbar linklerine tıklama olayları
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
            });
        });
    }

    startPeriodicChecks() {
        // Her 5 dakikada bir uyarıları kontrol et
        setInterval(() => {
            this.checkExpiryAlerts();
        }, 300000); // 5 dakika

        // Sayfa yüklendiğinde uyarıları kontrol et
        this.checkExpiryAlerts();
    }

    // API çağrıları için yardımcı fonksiyon
    async apiCall(endpoint, options = {}) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Token geçersiz, login sayfasına yönlendir
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API çağrı hatası:', error);
            this.showAlert('API çağrısında hata oluştu: ' + error.message, 'danger');
            throw error;
        }
    }

    // Loading göster/gizle
    showLoading(show = true) {
        const loading = document.getElementById('loading');
        loading.style.display = show ? 'block' : 'none';
    }

    // Alert göster
    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Container'ın başına ekle
        const container = document.querySelector('.container-fluid');
        container.insertAdjacentHTML('afterbegin', alertHtml);
        
        // 5 saniye sonra otomatik kapat
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    // Section'ları göster/gizle
    showSection(sectionName) {
        // Tüm section'ları gizle
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        // Seçilen section'ı göster
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;
        }
    }

    // Dashboard yükle
    async loadDashboard() {
        try {
            this.showLoading(true);
            
            const [medicinesResponse, stocksResponse, alertsResponse] = await Promise.all([
                this.apiCall('/medicines'),
                this.apiCall('/stocks'),
                this.apiCall('/alerts/unread')
            ]);

            // İstatistikleri güncelle
            document.getElementById('totalMedicines').textContent = medicinesResponse.data.length;
            document.getElementById('totalStocks').textContent = stocksResponse.data.length;
            
            // Yaklaşan son kullanım tarihleri
            const expiringSoon = stocksResponse.data.filter(stock => 
                stock.status === 'warning' || stock.status === 'critical'
            ).length;
            document.getElementById('expiringSoon').textContent = expiringSoon;
            
            // Süresi geçmiş
            const expired = stocksResponse.data.filter(stock => 
                stock.status === 'expired'
            ).length;
            document.getElementById('expired').textContent = expired;

            // Uyarı badge'ini güncelle
            const alertBadge = document.getElementById('alertBadge');
            if (alertsResponse.data.length > 0) {
                alertBadge.textContent = alertsResponse.data.length;
                alertBadge.style.display = 'inline';
            } else {
                alertBadge.style.display = 'none';
            }

        } catch (error) {
            console.error('Dashboard yükleme hatası:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // İlaçları yükle
    async loadMedicines() {
        try {
            this.showLoading(true);
            const response = await this.apiCall('/medicines');
            const medicines = response.data;

            const tbody = document.getElementById('medicinesTable');
            tbody.innerHTML = '';

            medicines.forEach(medicine => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${medicine.barcode}</td>
                    <td>${medicine.name}</td>
                    <td>${medicine.active_ingredient || '-'}</td>
                    <td>${medicine.manufacturer || '-'}</td>
                    <td>
                        <span class="badge bg-primary">${medicine.stock_count || 0}</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="app.showMedicineDetails(${medicine.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="app.showAddStockForm(${medicine.id})">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="app.editMedicine(${medicine.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="app.deleteMedicine(${medicine.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

        } catch (error) {
            console.error('İlaçlar yükleme hatası:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // Stokları yükle
    async loadStocks() {
        try {
            this.showLoading(true);
            const response = await this.apiCall('/stocks');
            const stocks = response.data;

            const tbody = document.getElementById('stocksTable');
            tbody.innerHTML = '';

            stocks.forEach(stock => {
                const statusClass = `status-${stock.status}`;
                const statusText = this.getStatusText(stock.status);
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${stock.medicine_name}</td>
                    <td>${stock.quantity}</td>
                    <td>${this.formatDate(stock.expiry_date)}</td>
                    <td>
                        <span class="${statusClass}">
                            <i class="fas fa-circle me-1"></i>${statusText}
                        </span>
                    </td>
                    <td>${stock.location || '-'}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="app.showStockDetails(${stock.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="app.editStock(${stock.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="app.deleteStock(${stock.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

        } catch (error) {
            console.error('Stoklar yükleme hatası:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // Uyarıları yükle
    async loadAlerts() {
        try {
            this.showLoading(true);
            const response = await this.apiCall('/alerts');
            const alerts = response.data;

            const container = document.getElementById('alertsContainer');
            container.innerHTML = '';

            if (alerts.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Henüz uyarı bulunmuyor.
                    </div>
                `;
                return;
            }

            alerts.forEach(alert => {
                const alertClass = `alert-${alert.alert_type.replace('_', '-')}`;
                const alertText = this.getAlertText(alert.alert_type);
                
                const alertHtml = `
                    <div class="alert alert-item ${alertClass} ${alert.is_read ? 'opacity-50' : ''}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="alert-heading">
                                    <i class="fas fa-exclamation-triangle me-2"></i>
                                    ${alertText}
                                </h6>
                                <p class="mb-1">
                                    <strong>${alert.medicine_name}</strong> - ${alert.barcode}
                                </p>
                                <p class="mb-1">
                                    <small class="text-muted">
                                        Son kullanım tarihi: ${this.formatDate(alert.expiry_date)}
                                    </small>
                                </p>
                                <p class="mb-0">
                                    <small class="text-muted">
                                        Konum: ${alert.location || 'Belirtilmemiş'}
                                    </small>
                                </p>
                            </div>
                            <div class="btn-group btn-group-sm">
                                ${!alert.is_read ? `
                                    <button class="btn btn-outline-success" onclick="app.markAlertRead(${alert.id})">
                                        <i class="fas fa-check"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-danger" onclick="app.deleteAlert(${alert.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', alertHtml);
            });

        } catch (error) {
            console.error('Uyarılar yükleme hatası:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // Barkod tarayıcısını başlat
    async startBarcodeScanner() {
        try {
            const scannerDiv = document.getElementById('barcodeScanner');
            scannerDiv.style.display = 'block';

            // Kamera erişimi iste (mobil optimizasyonu)
            const constraints = {
                video: {
                    facingMode: 'environment', // Arka kamera
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    frameRate: { ideal: 30, min: 15 }
                }
            };

            // Mobil cihaz kontrolü
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                constraints.video.facingMode = 'environment';
                console.log('Mobil cihaz tespit edildi, arka kamera kullanılacak');
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            const video = document.getElementById('scannerVideo');
            video.srcObject = stream;

            // QuaggaJS ile barkod tarama (mobil optimizasyonu)
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: video,
                    constraints: constraints
                },
                decoder: {
                    readers: [
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "code_39_reader",
                        "code_39_vin_reader",
                        "codabar_reader",
                        "upc_reader",
                        "upc_e_reader",
                        "i2of5_reader",
                        "qr_reader" // QR kod desteği eklendi
                    ]
                },
                locate: true,
                locator: {
                    patchSize: isMobile ? "large" : "medium", // Mobil için büyük patch
                    halfSample: true
                },
                numOfWorkers: navigator.hardwareConcurrency || 2, // CPU çekirdek sayısı
                frequency: 10 // Tarama sıklığı
            }, (err) => {
                if (err) {
                    console.error('QuaggaJS başlatma hatası:', err);
                    this.showAlert('Barkod tarayıcısı başlatılamadı: ' + err.message, 'danger');
                    this.stopBarcodeScanner();
                    return;
                }
                console.log('QuaggaJS başarıyla başlatıldı');
                Quagga.start();
            });

            // Barkod bulunduğunda
            Quagga.onDetected((data) => {
                const code = data.codeResult.code;
                console.log('Barkod bulundu:', code);
                
                this.stopBarcodeScanner();
                this.searchMedicineByBarcode(code);
            });

            // Hata durumunda
            Quagga.onProcessed((result) => {
                if (result && result.boxes) {
                    const drawingCtx = Quagga.canvas.ctx.overlay;
                    const drawingCanvas = Quagga.canvas.dom.overlay;
                    
                    drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                    
                    if (result.boxes) {
                        result.boxes.filter(box => box !== result.box).forEach(box => {
                            Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
                        });
                    }
                    
                    if (result.box) {
                        Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
                    }
                    
                    if (result.codeResult && result.codeResult.code) {
                        Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
                    }
                }
            });

        } catch (error) {
            console.error('Kamera erişim hatası:', error);
            let errorMessage = 'Kamera erişimi reddedildi veya mevcut değil';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Kamera bulunamadı. Lütfen cihazınızda kamera olduğundan emin olun.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Bu tarayıcı kamera erişimini desteklemiyor.';
            }
            
            this.showAlert(errorMessage, 'danger');
        }
    }

    // Barkod tarayıcısını durdur
    stopBarcodeScanner() {
        const scannerDiv = document.getElementById('barcodeScanner');
        scannerDiv.style.display = 'none';

        const video = document.getElementById('scannerVideo');
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }

        if (Quagga) {
            Quagga.stop();
        }
    }

    // Barkod ile ilaç ara
    async searchMedicineByBarcode(barcode) {
        try {
            this.showLoading(true);
            const response = await this.apiCall(`/medicines/barcode/${barcode}`);
            
            if (response.success) {
                let message = `İlaç bulundu: ${response.data.name}`;
                
                // API bilgilerini göster
                if (response.api_info) {
                    if (response.api_info.country === 'TR') {
                        message += ' (Türkiye)';
                    } else if (response.api_info.country === 'US') {
                        message += ' (ABD)';
                    }
                    
                    if (response.api_info.prescription_required) {
                        message += ' - Reçeteli';
                    }
                }
                
                this.showAlert(message, 'success');
                
                // Detaylı bilgi varsa göster
                if (response.source !== 'database') {
                    await this.showMedicineDetails(response.data.id, response.api_info);
                } else {
                    this.showAddStockForm(response.data.id);
                }
            } else {
                this.showAlert('Bu barkod ile ilaç bulunamadı', 'warning');
            }
        } catch (error) {
            console.error('Barkod arama hatası:', error);
            this.showAlert('Barkod ile arama yapılırken hata oluştu', 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    // Son kullanım tarihi uyarılarını kontrol et
    async checkExpiryAlerts() {
        try {
            const response = await this.apiCall('/alerts/check-expiry', {
                method: 'POST'
            });
            
            if (response.success && response.message !== '0 yeni uyarı oluşturuldu') {
                this.showAlert(response.message, 'info');
                await this.loadDashboard(); // Dashboard'u yenile
            }
        } catch (error) {
            console.error('Uyarı kontrol hatası:', error);
        }
    }

    // Yardımcı fonksiyonlar
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR');
    }

    getStatusText(status) {
        const statusMap = {
            'good': 'İyi',
            'warning': 'Dikkat',
            'critical': 'Kritik',
            'expired': 'Süresi Geçmiş'
        };
        return statusMap[status] || status;
    }

    getAlertText(alertType) {
        const alertMap = {
            '30_days': '30 gün içinde son kullanım tarihi',
            '15_days': '15 gün içinde son kullanım tarihi',
            '7_days': '7 gün içinde son kullanım tarihi',
            'expired': 'Son kullanım tarihi geçmiş'
        };
        return alertMap[alertType] || alertType;
    }

    // Modal fonksiyonları (basit implementasyon)
    showAddMedicineForm() {
        this.showAlert('İlaç ekleme formu yakında eklenecek', 'info');
    }

    showAddStockForm(medicineId = null) {
        this.showAlert('Stok ekleme formu yakında eklenecek', 'info');
    }

    async showMedicineDetails(medicineId, apiInfo = null) {
        try {
            // İlaç detaylarını göster
            const medicine = await this.apiCall(`/medicines/${medicineId}`);
            
            if (medicine.success) {
                let detailsHtml = `
                    <div class="card">
                        <div class="card-header">
                            <h5><i class="fas fa-pills me-2"></i>İlaç Detayları</h5>
                        </div>
                        <div class="card-body">
                            <h6><strong>${medicine.data.name}</strong></h6>
                            <p><strong>Barkod:</strong> ${medicine.data.barcode}</p>
                `;
                
                if (medicine.data.active_ingredient) {
                    detailsHtml += `<p><strong>Etken Madde:</strong> ${medicine.data.active_ingredient}</p>`;
                }
                
                if (medicine.data.manufacturer) {
                    detailsHtml += `<p><strong>Üretici:</strong> ${medicine.data.manufacturer}</p>`;
                }
                
                if (medicine.data.dosage_form) {
                    detailsHtml += `<p><strong>Dozaj Formu:</strong> ${medicine.data.dosage_form}</p>`;
                }
                
                if (medicine.data.strength) {
                    detailsHtml += `<p><strong>Güçlü:</strong> ${medicine.data.strength}</p>`;
                }
                
                if (apiInfo) {
                    detailsHtml += `<hr><h6><strong>API Bilgileri:</strong></h6>`;
                    
                    if (apiInfo.country) {
                        const countryName = apiInfo.country === 'TR' ? 'Türkiye' : 'ABD';
                        detailsHtml += `<p><strong>Ülke:</strong> ${countryName}</p>`;
                    }
                    
                    if (apiInfo.prescription_required) {
                        detailsHtml += `<p><strong>Reçete:</strong> <span class="badge bg-warning">Reçeteli</span></p>`;
                    }
                    
                    if (apiInfo.storage_conditions) {
                        detailsHtml += `<p><strong>Saklama:</strong> ${apiInfo.storage_conditions.join(', ')}</p>`;
                    }
                }
                
                detailsHtml += `
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-primary me-2" onclick="app.showAddStockForm(${medicine.data.id})">
                                <i class="fas fa-plus me-2"></i>Stok Ekle
                            </button>
                            <button class="btn btn-secondary" onclick="app.closeModal()">
                                <i class="fas fa-times me-2"></i>Kapat
                            </button>
                        </div>
                    </div>
                `;
                
                // Modal göster
                this.showModal('İlaç Detayları', detailsHtml);
            }
        } catch (error) {
            console.error('İlaç detayları hatası:', error);
            this.showAlert('İlaç detayları gösterilemedi', 'danger');
        }
    }

    showModal(title, content) {
        const modalHtml = `
            <div class="modal fade" id="medicineModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Eski modal'ı kaldır
        const existingModal = document.getElementById('medicineModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Yeni modal'ı ekle
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById('medicineModal'));
        modal.show();
    }

    closeModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('medicineModal'));
        if (modal) {
            modal.hide();
        }
    }

    editMedicine(medicineId) {
        this.showAlert('İlaç düzenleme yakında eklenecek', 'info');
    }

    deleteMedicine(medicineId) {
        if (confirm('Bu ilacı silmek istediğinizden emin misiniz?')) {
            this.showAlert('İlaç silme yakında eklenecek', 'info');
        }
    }

    showStockDetails(stockId) {
        this.showAlert('Stok detayları yakında eklenecek', 'info');
    }

    editStock(stockId) {
        this.showAlert('Stok düzenleme yakında eklenecek', 'info');
    }

    deleteStock(stockId) {
        if (confirm('Bu stoku silmek istediğinizden emin misiniz?')) {
            this.showAlert('Stok silme yakında eklenecek', 'info');
        }
    }

    async markAlertRead(alertId) {
        try {
            await this.apiCall(`/alerts/${alertId}/read`, {
                method: 'PUT'
            });
            this.showAlert('Uyarı okundu olarak işaretlendi', 'success');
            await this.loadAlerts();
            await this.loadDashboard();
        } catch (error) {
            console.error('Uyarı okundu işaretleme hatası:', error);
        }
    }

    async markAllAlertsRead() {
        try {
            await this.apiCall('/alerts/read-all', {
                method: 'PUT'
            });
            this.showAlert('Tüm uyarılar okundu olarak işaretlendi', 'success');
            await this.loadAlerts();
            await this.loadDashboard();
        } catch (error) {
            console.error('Tüm uyarıları okundu işaretleme hatası:', error);
        }
    }

    deleteAlert(alertId) {
        if (confirm('Bu uyarıyı silmek istediğinizden emin misiniz?')) {
            this.showAlert('Uyarı silme yakında eklenecek', 'info');
        }
    }

    // Admin Panel Fonksiyonları
    async loadAdminStats() {
        try {
            this.showLoading(true);
            
            const [usersResponse, medicinesResponse] = await Promise.all([
                this.apiCall('/auth/admin/users'),
                this.apiCall('/medicines')
            ]);

            const users = usersResponse.data;
            const medicines = medicinesResponse.data;

            // İstatistikleri güncelle
            document.getElementById('totalUsers').textContent = users.length;
            document.getElementById('activeUsers').textContent = users.filter(u => u.isActive).length;
            document.getElementById('adminUsers').textContent = users.filter(u => u.role === 'admin').length;
            document.getElementById('totalMedicinesAdmin').textContent = medicines.length;

            // Kullanıcı tablosunu güncelle
            this.updateUsersTable(users);

        } catch (error) {
            console.error('Admin istatistikleri yükleme hatası:', error);
        } finally {
            this.showLoading(false);
        }
    }

    updateUsersTable(users) {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'bg-warning' : 'bg-primary'}">
                        ${user.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                    </span>
                </td>
                <td>
                    <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">
                        ${user.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                </td>
                <td>${user.lastLogin ? this.formatDate(user.lastLogin) : '-'}</td>
                <td>${this.formatDate(user.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-${user.isActive ? 'warning' : 'success'}" 
                                onclick="app.toggleUserStatus(${user.id}, ${user.isActive})">
                            <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn btn-outline-${user.role === 'admin' ? 'primary' : 'warning'}" 
                                onclick="app.toggleUserRole(${user.id}, '${user.role}')">
                            <i class="fas fa-${user.role === 'admin' ? 'user' : 'user-shield'}"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async toggleUserStatus(userId, currentStatus) {
        try {
            await this.apiCall(`/auth/admin/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ isActive: !currentStatus })
            });
            
            this.showAlert(`Kullanıcı ${!currentStatus ? 'aktif' : 'pasif'} edildi`, 'success');
            await this.loadAdminStats();
        } catch (error) {
            console.error('Kullanıcı durum değiştirme hatası:', error);
        }
    }

    async toggleUserRole(userId, currentRole) {
        try {
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            await this.apiCall(`/auth/admin/users/${userId}/role`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole })
            });
            
            this.showAlert(`Kullanıcı rolü ${newRole} olarak güncellendi`, 'success');
            await this.loadAdminStats();
        } catch (error) {
            console.error('Kullanıcı rol değiştirme hatası:', error);
        }
    }

    // Profil Fonksiyonları
    async loadProfile() {
        try {
            this.showLoading(true);
            const response = await this.apiCall('/auth/profile');
            
            if (response.success) {
                const user = response.data;
                document.getElementById('profileFirstName').value = user.firstName;
                document.getElementById('profileLastName').value = user.lastName;
                document.getElementById('profileEmail').value = user.email;
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async updateProfile() {
        try {
            const firstName = document.getElementById('profileFirstName').value;
            const lastName = document.getElementById('profileLastName').value;
            const email = document.getElementById('profileEmail').value;

            await this.apiCall('/auth/profile', {
                method: 'PUT',
                body: JSON.stringify({ firstName, lastName, email })
            });

            this.showAlert('Profil başarıyla güncellendi', 'success');
            
            // Kullanıcı bilgilerini güncelle
            this.user.firstName = firstName;
            this.user.lastName = lastName;
            this.user.email = email;
            localStorage.setItem('user', JSON.stringify(this.user));
            
            // Navbar'ı güncelle
            document.getElementById('userName').textContent = firstName + ' ' + lastName;
            
        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
        }
    }

    async changePassword() {
        try {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (newPassword !== confirmPassword) {
                this.showAlert('Yeni şifreler eşleşmiyor', 'danger');
                return;
            }

            await this.apiCall('/auth/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword })
            });

            this.showAlert('Şifre başarıyla değiştirildi', 'success');
            
            // Form'u temizle
            document.getElementById('passwordForm').reset();
            
        } catch (error) {
            console.error('Şifre değiştirme hatası:', error);
        }
    }

    // Çıkış yap
    logout() {
        if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
    }
}

// Global fonksiyonlar (HTML'den çağrılacak)
function showDashboard() {
    app.showSection('dashboard');
    app.loadDashboard();
}

function showMedicines() {
    app.showSection('medicines');
    app.loadMedicines();
}

function showStocks() {
    app.showSection('stocks');
    app.loadStocks();
}

function showAlerts() {
    app.showSection('alerts');
    app.loadAlerts();
}

function startBarcodeScanner() {
    app.startBarcodeScanner();
}

function stopBarcodeScanner() {
    app.stopBarcodeScanner();
}

function showAddMedicineForm() {
    app.showAddMedicineForm();
}

function showAddStockForm() {
    app.showAddStockForm();
}

function checkExpiryAlerts() {
    app.checkExpiryAlerts();
}

function markAllAlertsRead() {
    app.markAllAlertsRead();
}

function showAdminPanel() {
    app.showSection('adminPanel');
    app.loadAdminStats();
}

function showProfile() {
    app.showSection('profile');
    app.loadProfile();
}

function showSettings() {
    app.showSection('profile');
    app.loadProfile();
}

function logout() {
    app.logout();
}

// Form event listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app');
    
    // App'i başlat
    try {
        app = new MedicineStorageApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Hata durumunda login sayfasına yönlendir
        window.location.href = '/';
    }
    
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (app) app.updateProfile();
        });
    }

    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (app) app.changePassword();
        });
    }
});
