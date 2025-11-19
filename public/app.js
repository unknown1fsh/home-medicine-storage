// Evdeki İlaç Depom - Ana JavaScript Uygulaması
class MedicineStorageApp {
    constructor() {
        // Dinamik API URL - Railway deployment için
        this.apiBaseUrl = (window.location.origin || 'http://localhost:3000') + '/api';
        this.currentSection = 'dashboard';
        this.scanner = null;
        this.user = null;
        this.medicines = [];
        this.stocks = [];
        this.alerts = [];
        this.activeModalId = null;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('API Base URL:', this.apiBaseUrl);
        console.log('Mobil cihaz tespit edildi:', this.isMobile);
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

            // Authentication successful, setting up interface
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
                // User data loaded successfully
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
        const {
            silent = false,
            ...fetchOptions
        } = options;
        try {
            const token = localStorage.getItem('authToken');
            const isFormData = fetchOptions.body instanceof FormData;

            const headers = {
                'Authorization': `Bearer ${token}`,
            };

            if (!isFormData) {
                headers['Content-Type'] = 'application/json';
            }

            fetchOptions.headers = {
                ...headers,
                ...(options.headers || {})
            };

            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, fetchOptions);

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                window.location.href = '/';
                return;
            }

            const contentType = response.headers.get('Content-Type') || '';
            const isJson = contentType.includes('application/json');

            if (!response.ok) {
                let errorMessage = `İstek başarısız oldu (HTTP ${response.status})`;
                let errorDetails = null;

                if (isJson) {
                    errorDetails = await response.json().catch(() => null);
                    if (errorDetails) {
                        errorMessage = errorDetails.message || errorDetails.error || errorMessage;
                    }
                } else {
                    const text = await response.text().catch(() => '');
                    if (text) {
                        errorMessage = text;
                    }
                }

                if (!silent) {
                    this.showAlert(errorMessage, 'danger');
                }

                const error = new Error(errorMessage);
                error.status = response.status;
                error.details = errorDetails;
                throw error;
            }

            if (response.status === 204) {
                return null;
            }

            if (isJson) {
                return await response.json();
            }

            return await response.text();
        } catch (error) {
            console.error('API çağrı hatası:', error);
            if (!silent) {
                this.showAlert('API çağrısında hata oluştu: ' + error.message, 'danger');
            }
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

            // Kamera izin durumunu kontrol et
            await this.showCameraPermissionInfo();

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
            this.medicines = medicines;

            const tbody = document.getElementById('medicinesTable');
            tbody.innerHTML = '';

            if (medicines.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-4">
                            Henüz kayıtlı ilaç bulunmuyor.
                            <a href="#" onclick="app.showAddMedicineForm()" class="ms-1">İlk ilacı ekleyin.</a>
                        </td>
                    </tr>
                `;
                return;
            }

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
            this.stocks = stocks;

            const tbody = document.getElementById('stocksTable');
            tbody.innerHTML = '';

            if (stocks.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted py-4">
                            Aktif stok bulunmuyor.
                            <a href="#" onclick="app.showAddStockForm()" class="ms-1">Yeni stok ekleyin.</a>
                        </td>
                    </tr>
                `;
                return;
            }

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
            this.alerts = alerts;

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

    // Kamera izin durumunu kontrol et
    async checkCameraPermission() {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'camera' });
            return permissionStatus.state;
        } catch (error) {
            console.log('Permission API desteklenmiyor:', error);
            return 'unknown';
        }
    }

    // Mevcut kamera cihazlarını listele
    async getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
            console.log('Mevcut kameralar:', cameras);
            return cameras;
        } catch (error) {
            console.error('Kamera cihazları listelenemedi:', error);
            return [];
        }
    }

    // Kamera izin durumunu göster
    async showCameraPermissionInfo() {
        const permissionState = await this.checkCameraPermission();
        const cameraInfo = document.getElementById('cameraInfo');
        
        if (cameraInfo) {
            if (permissionState === 'denied') {
                cameraInfo.innerHTML = `
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <small>Kamera izni reddedilmiş. Lütfen tarayıcı ayarlarından kamera iznini verin.</small>
                `;
                cameraInfo.className = 'alert alert-warning mt-3';
                cameraInfo.style.display = 'block';
            } else if (permissionState === 'prompt') {
                cameraInfo.innerHTML = `
                    <i class="fas fa-info-circle me-2"></i>
                    <small>Kamera erişimi için izin verilmesi gerekmektedir. Tarayıcınızın kamera iznini kontrol edin.</small>
                `;
                cameraInfo.className = 'alert alert-info mt-3';
                cameraInfo.style.display = 'block';
            } else {
                cameraInfo.style.display = 'none';
            }
        }
    }

    // Kapsamlı kamera test fonksiyonu
    async testCameraAccess() {
        try {
            console.log('Kamera erişimi test ediliyor...');
            
            // 1. Kamera cihazlarını kontrol et
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length === 0) {
                throw new Error('Hiç kamera cihazı bulunamadı');
            }
            
            console.log(`${videoDevices.length} kamera cihazı bulundu:`, videoDevices.map(d => d.label || d.deviceId));
            
            // 2. Kamera izin durumunu kontrol et
            const permissionState = await this.checkCameraPermission();
            console.log('Kamera izin durumu:', permissionState);
            
            if (permissionState === 'denied') {
                throw new Error('Kamera izni reddedilmiş');
            }
            
            // 3. Kamera cihazının kullanılabilirliğini test et
            const testConstraints = [
                { video: { width: 320, height: 240 } },
                { video: { width: 160, height: 120 } },
                { video: true }
            ];
            
            let testResult = null;
            for (const constraints of testConstraints) {
                try {
                    console.log('Test constraints:', constraints);
                    const testStream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    // Stream'in gerçekten çalıştığını kontrol et
                    const videoTrack = testStream.getVideoTracks()[0];
                    if (videoTrack && videoTrack.readyState === 'live') {
                        console.log('Kamera erişim testi başarılı');
                        testResult = { success: true, constraints };
                        
                        // Test başarılı, stream'i kapat
                        testStream.getTracks().forEach(track => track.stop());
                        break;
                    } else {
                        testStream.getTracks().forEach(track => track.stop());
                    }
                } catch (error) {
                    console.log('Test constraints başarısız:', error.name);
                    continue;
                }
            }
            
            if (!testResult) {
                throw new Error('Tüm kamera test constraints başarısız oldu');
            }
            
            return testResult;
        } catch (error) {
            console.error('Kamera erişim testi başarısız:', error);
            return { success: false, error: error };
        }
    }

    // NotReadableError için gelişmiş çözüm denemeleri
    async tryFixNotReadableError() {
        try {
            this.showLoading(true);
            console.log('NotReadableError için gelişmiş çözüm denemeleri başlatılıyor...');
            
            // Kamera kullanım durumu kontrolü - NotReadableError durumunda atla
            console.log('NotReadableError çözüm denemeleri başlatılıyor...');
            
            // Windows kamera erişim sorunları için özel çözümler
            const solutions = [
                {
                    name: 'Çok küçük boyutlar (80x60)',
                    constraints: { video: { width: 80, height: 60 } }
                },
                {
                    name: 'Çok düşük çözünürlük (160x120)',
                    constraints: { video: { width: 160, height: 120 } }
                },
                {
                    name: 'Minimal çözünürlük (320x240)',
                    constraints: { video: { width: 320, height: 240 } }
                },
                {
                    name: 'Sadece video: true',
                    constraints: { video: true }
                },
                {
                    name: 'Audio ile birlikte',
                    constraints: { video: true, audio: false }
                },
                {
                    name: 'Exact constraints (320x240)',
                    constraints: { video: { width: { exact: 320 }, height: { exact: 240 } } }
                },
                {
                    name: 'Minimal constraints',
                    constraints: { video: { width: { min: 160 }, height: { min: 120 } } }
                },
                {
                    name: 'FacingMode environment',
                    constraints: { video: { facingMode: 'environment' } }
                },
                {
                    name: 'FacingMode user',
                    constraints: { video: { facingMode: 'user' } }
                },
                {
                    name: 'DeviceId ile spesifik kamera',
                    constraints: async () => {
                        const devices = await navigator.mediaDevices.enumerateDevices();
                        const videoDevices = devices.filter(device => device.kind === 'videoinput');
                        if (videoDevices.length > 0) {
                            return { video: { deviceId: { exact: videoDevices[0].deviceId } } };
                        }
                        return null;
                    }
                },
                {
                    name: 'FrameRate sınırlaması',
                    constraints: { video: { width: 320, height: 240, frameRate: { max: 15 } } }
                },
                {
                    name: 'AspectRatio sınırlaması',
                    constraints: { video: { aspectRatio: { exact: 4/3 } } }
                },
                {
                    name: 'Hiç constraint yok',
                    constraints: { video: {} }
                },
                {
                    name: 'Çok düşük frameRate',
                    constraints: { video: { width: 320, height: 240, frameRate: { max: 5 } } }
                },
                {
                    name: 'Sadece width constraint',
                    constraints: { video: { width: 320 } }
                },
                {
                    name: 'Sadece height constraint',
                    constraints: { video: { height: 240 } }
                },
                {
                    name: 'Çok düşük frameRate (1fps)',
                    constraints: { video: { width: 320, height: 240, frameRate: { max: 1 } } }
                },
                {
                    name: 'Çok küçük boyutlar (64x48)',
                    constraints: { video: { width: 64, height: 48 } }
                },
                {
                    name: 'Sadece width (160)',
                    constraints: { video: { width: 160 } }
                },
                {
                    name: 'Sadece height (120)',
                    constraints: { video: { height: 120 } }
                }
            ];

            let results = [];
            let successfulSolution = null;
            
            for (let i = 0; i < solutions.length; i++) {
                try {
                    console.log(`Çözüm ${i + 1} deneniyor: ${solutions[i].name}`);
                    
                    let constraints = solutions[i].constraints;
                    
                    // Eğer constraints bir fonksiyon ise çalıştır
                    if (typeof constraints === 'function') {
                        constraints = await constraints();
                        if (!constraints) {
                            console.log(`Çözüm ${i + 1} atlandı: Kamera cihazı bulunamadı`);
                            results.push(`⏭️ Çözüm ${i + 1}: ${solutions[i].name} - ATLANDI`);
                            continue;
                        }
                    }
                    
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    // Stream'in gerçekten çalıştığını kontrol et
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack && videoTrack.readyState === 'live') {
                        // Başarılı, stream'i kapat
                        stream.getTracks().forEach(track => track.stop());
                        console.log(`✅ Çözüm ${i + 1} başarılı: ${solutions[i].name}`);
                        
                        results.push(`✅ Çözüm ${i + 1}: ${solutions[i].name} - BAŞARILI`);
                        successfulSolution = solutions[i];
                        
                        this.showAlert(`
                            <strong>NotReadableError Çözümü Bulundu!</strong><br>
                            <strong>Çalışan çözüm:</strong> ${solutions[i].name}<br>
                            <strong>Constraints:</strong> <code>${JSON.stringify(constraints)}</code><br><br>
                            <strong>Tüm denenen çözümler:</strong><br>
                            <pre style="text-align: left; font-size: 12px; margin: 10px 0;">${results.join('\n')}</pre>
                        `, 'success');
                        
                        return { success: true, solution: solutions[i].name, constraints: constraints };
                    } else {
                        stream.getTracks().forEach(track => track.stop());
                        console.log(`❌ Çözüm ${i + 1} başarısız: Stream canlı değil`);
                        results.push(`❌ Çözüm ${i + 1}: ${solutions[i].name} - Stream canlı değil`);
                    }
                } catch (error) {
                    console.log(`❌ Çözüm ${i + 1} başarısız: ${error.name}`);
                    results.push(`❌ Çözüm ${i + 1}: ${solutions[i].name} - ${error.name}`);
                }
            }
            
            // Hiçbir çözüm çalışmadı - Windows özel rehberlik
            this.showAlert(`
                <strong>🚨 NotReadableError Çözümü Bulunamadı</strong><br><br>
                <strong>📊 Tüm denenen çözümler (${solutions.length} adet):</strong><br>
                <pre style="text-align: left; font-size: 11px; margin: 10px 0; max-height: 200px; overflow-y: auto;">${results.join('\n')}</pre><br>
                
                <strong>🔍 Durum Analizi:</strong><br>
                • Kamera cihazı tespit edildi: ✅<br>
                • Kamera izni verildi: ✅<br>
                • Tüm constraint çözümleri başarısız: ❌<br>
                • Muhtemel nedenler:<br>
                &nbsp;&nbsp;• Kamera başka uygulama tarafından kullanılıyor<br>
                &nbsp;&nbsp;• <strong>Kaspersky antivirüs kamera erişimini engelliyor</strong><br>
                &nbsp;&nbsp;• Windows Defender kamera erişimini engelliyor<br>
                &nbsp;&nbsp;• Diğer güvenlik yazılımları kamera erişimini engelliyor<br><br>
                
                <strong>⚡ ACİL ÇÖZÜM ADIMLARI:</strong><br><br>
                <strong>1️⃣ Kaspersky Antivirüs Kontrolü (ÖNCELİK):</strong><br>
                • Kaspersky uygulamasını açın<br>
                • Ayarlar > Koruma > Web Kamerası Koruması<br>
                • "Web kamerası erişimini engelle" seçeneğini KAPATIN<br>
                • Tarayıcınızı "Güvenilir uygulamalar" listesine ekleyin<br>
                • Kaspersky'yi geçici olarak devre dışı bırakın (5 dakika)<br><br>
                
                <strong>2️⃣ Görev Yöneticisi Kontrolü:</strong><br>
                • Ctrl+Shift+Esc tuşlarına basın<br>
                • İşlemler sekmesinde kamera kullanan uygulamaları bulun<br>
                • Windows Kamera, Zoom, Teams, Skype gibi uygulamaları sonlandırın<br><br>
                
                <strong>3️⃣ Windows Kamera Uygulaması:</strong><br>
                • Windows Kamera uygulamasını açın<br>
                • Eğer açılıyorsa, uygulamayı kapatın<br>
                • Eğer açılmıyorsa, kamera sürücülerinde sorun var<br><br>
                
                <strong>4️⃣ Tarayıcı Yeniden Başlatma:</strong><br>
                • Bu tarayıcıyı tamamen kapatın<br>
                • Tarayıcıyı yeniden açın<br>
                • Tekrar deneyin<br><br>
                
                <strong>5️⃣ Sistem Yeniden Başlatma:</strong><br>
                • Bilgisayarı yeniden başlatın<br>
                • Bu genellikle kamera erişim sorunlarını çözer<br><br>
                
                <button onclick="app.showDetailedCameraGuide()" class="btn btn-info btn-sm">📖 Detaylı Çözüm Rehberi</button>
                <button onclick="app.diagnoseCameraIssues()" class="btn btn-warning btn-sm">🔍 Kamera Tanılama</button>
            `, 'warning');
            
            return { success: false, message: 'Tüm çözüm denemeleri başarısız oldu' };
            
        } catch (error) {
            console.error('NotReadableError çözüm denemesi hatası:', error);
            this.showAlert('NotReadableError çözüm denemesi sırasında hata oluştu: ' + error.message, 'danger');
            return { success: false, message: error.message };
        } finally {
            this.showLoading(false);
        }
    }

    // Kamera cihazının kullanım durumunu kontrol et
    async checkCameraUsageStatus() {
        try {
            const isWindows = navigator.platform.toLowerCase().includes('win');
            if (!isWindows) {
                return { isInUse: false, details: 'Windows cihazı değil' };
            }
            
            const details = [];
            let isInUse = false;
            
            // 1. Kamera cihazlarını kontrol et
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                details.push(`📷 Kamera cihazları: ${videoDevices.length} adet`);
                
                if (videoDevices.length === 0) {
                    details.push('❌ Hiç kamera cihazı bulunamadı');
                    return { isInUse: true, details: details.join('<br>') };
                }
            } catch (error) {
                details.push(`❌ Kamera cihazları kontrol edilemedi: ${error.message}`);
            }
            
            // 2. Kamera erişim testi - çok basit (NotReadableError'u yakalamak için)
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = stream.getVideoTracks()[0];
                
                if (videoTrack && videoTrack.readyState === 'live') {
                    details.push('✅ Kamera erişimi başarılı - cihaz kullanılabilir');
                    stream.getTracks().forEach(track => track.stop());
                } else {
                    details.push('❌ Kamera stream canlı değil - cihaz kullanımda olabilir');
                    stream.getTracks().forEach(track => track.stop());
                    isInUse = true;
                }
            } catch (error) {
                details.push(`❌ Kamera erişim testi başarısız: ${error.name}`);
                if (error.name === 'NotReadableError') {
                    details.push('⚠️ NotReadableError - Kamera başka uygulama tarafından kullanılıyor olabilir');
                    isInUse = true;
                } else if (error.name === 'NotAllowedError') {
                    details.push('⚠️ NotAllowedError - Kamera izni reddedilmiş');
                } else if (error.name === 'NotFoundError') {
                    details.push('⚠️ NotFoundError - Kamera cihazı bulunamadı');
                } else {
                    details.push(`⚠️ Bilinmeyen hata: ${error.message}`);
                }
            }
            
            // 3. Windows özel kontrolleri
            if (isWindows) {
                details.push('🪟 Windows cihazı tespit edildi');
                details.push('💡 Öneriler: Windows Kamera, Zoom, Teams gibi uygulamaları kapatın');
            }
            
            return { isInUse, details: details.join('<br>') };
            
        } catch (error) {
            return { isInUse: true, details: `❌ Kamera kullanım kontrolü hatası: ${error.message}` };
        }
    }

    // Windows kamera erişim sorunları için özel kontrol
    async checkWindowsCameraAccess() {
        try {
            const isWindows = navigator.platform.toLowerCase().includes('win');
            if (!isWindows) {
                return { isWindows: false, message: 'Windows cihazı değil' };
            }
            
            const checks = [];
            
            // 1. Kamera cihazlarını kontrol et
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                checks.push(`📷 Kamera cihazları: ${videoDevices.length} adet`);
                
                if (videoDevices.length === 0) {
                    checks.push('❌ Hiç kamera cihazı bulunamadı');
                    return { isWindows: true, checks, hasIssue: true };
                }
            } catch (error) {
                checks.push(`❌ Kamera cihazları kontrol edilemedi: ${error.message}`);
            }
            
            // 2. Kamera izinlerini kontrol et
            try {
                const permissionState = await this.checkCameraPermission();
                checks.push(`🔐 Kamera izin durumu: ${permissionState}`);
                
                if (permissionState === 'denied') {
                    checks.push('❌ Kamera izni reddedilmiş');
                    return { isWindows: true, checks, hasIssue: true };
                }
            } catch (error) {
                checks.push(`⚠️ Kamera izin durumu kontrol edilemedi: ${error.message}`);
            }
            
            // 3. Basit kamera erişim testi
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = stream.getVideoTracks()[0];
                
                if (videoTrack && videoTrack.readyState === 'live') {
                    checks.push('✅ Kamera erişimi başarılı');
                    stream.getTracks().forEach(track => track.stop());
                } else {
                    checks.push('❌ Kamera stream canlı değil');
                    stream.getTracks().forEach(track => track.stop());
                    return { isWindows: true, checks, hasIssue: true };
                }
            } catch (error) {
                checks.push(`❌ Kamera erişim testi başarısız: ${error.name}`);
                return { isWindows: true, checks, hasIssue: true };
            }
            
            return { isWindows: true, checks, hasIssue: false };
            
        } catch (error) {
            return { isWindows: true, checks: [`❌ Windows kamera kontrolü hatası: ${error.message}`], hasIssue: true };
        }
    }

    // Kamera sorunlarını tanıla
    async diagnoseCameraIssues() {
        try {
            this.showLoading(true);
            let diagnosis = [];
            
            // 1. Tarayıcı desteği kontrolü
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                diagnosis.push('❌ Tarayıcınız kamera erişimini desteklemiyor');
            } else {
                diagnosis.push('✅ Tarayıcı kamera erişimini destekliyor');
            }
            
            // 2. HTTPS kontrolü
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                diagnosis.push('❌ HTTPS bağlantısı gereklidir');
            } else {
                diagnosis.push('✅ Güvenli bağlantı (HTTPS/localhost)');
            }
            
            // 3. Kamera cihazları kontrolü
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cameras = devices.filter(device => device.kind === 'videoinput');
                if (cameras.length === 0) {
                    diagnosis.push('❌ Hiç kamera cihazı bulunamadı');
                } else {
                    diagnosis.push(`✅ ${cameras.length} kamera cihazı bulundu`);
                    cameras.forEach((camera, index) => {
                        const label = camera.label || `Kamera ${index + 1}`;
                        diagnosis.push(`   📷 ${label}`);
                    });
                }
            } catch (error) {
                diagnosis.push('❌ Kamera cihazları listelenemedi: ' + error.message);
            }
            
            // 4. İzin durumu kontrolü
            try {
                const permissionState = await this.checkCameraPermission();
                if (permissionState === 'denied') {
                    diagnosis.push('❌ Kamera izni reddedilmiş');
                } else if (permissionState === 'prompt') {
                    diagnosis.push('⚠️ Kamera izni henüz verilmemiş');
                } else {
                    diagnosis.push('✅ Kamera izni verilmiş');
                }
            } catch (error) {
                diagnosis.push('⚠️ İzin durumu kontrol edilemedi');
            }
            
            // 5. Kamera erişim testi
            try {
                const testResult = await this.testCameraAccess();
                if (testResult.success) {
                    diagnosis.push('✅ Kamera erişim testi başarılı');
                    diagnosis.push(`📋 Çalışan constraints: ${JSON.stringify(testResult.constraints)}`);
                } else {
                    diagnosis.push('❌ Kamera erişim testi başarısız');
                    if (testResult.error) {
                        diagnosis.push(`🔍 Hata detayı: ${testResult.error.name} - ${testResult.error.message}`);
                    }
                    
                    // NotReadableError için özel çözüm denemeleri
                    try {
                        const fixResult = await this.tryFixNotReadableError();
                        if (fixResult.success) {
                            diagnosis.push(`🔧 NotReadableError çözümü bulundu: ${fixResult.solution}`);
                            diagnosis.push(`📋 Çalışan constraints: ${JSON.stringify(fixResult.constraints)}`);
                        } else {
                            diagnosis.push('❌ NotReadableError çözümü bulunamadı');
                        }
                    } catch (fixError) {
                        diagnosis.push('❌ NotReadableError çözüm denemesi hatası: ' + fixError.message);
                    }
                }
            } catch (error) {
                diagnosis.push('❌ Kamera erişim testi hatası: ' + error.message);
            }
            
            // 6. Windows özel kontrolleri
            try {
                const windowsCheck = await this.checkWindowsCameraAccess();
                if (windowsCheck.isWindows) {
                    diagnosis.push('🪟 Windows cihazı tespit edildi');
                    diagnosis.push(...windowsCheck.checks);
                    
                    if (windowsCheck.hasIssue) {
                        diagnosis.push('⚠️ Windows kamera erişim sorunu tespit edildi');
                    }
                }
            } catch (error) {
                diagnosis.push('⚠️ Windows kontrolü yapılamadı: ' + error.message);
            }
            
            // 7. Kamera kullanım durumu kontrolü
            try {
                const usageCheck = await this.checkCameraUsageStatus();
                if (usageCheck.isInUse) {
                    diagnosis.push('⚠️ Kamera cihazı kullanımda olabilir');
                    diagnosis.push('💡 Detaylar: ' + usageCheck.details);
                }
            } catch (error) {
                diagnosis.push('⚠️ Kamera kullanım kontrolü yapılamadı: ' + error.message);
            }
            
            // Sonuçları göster
            const diagnosisText = diagnosis.join('\n');
            console.log('Kamera Tanılama Sonuçları:\n' + diagnosisText);
            
            this.showAlert(`
                <strong>Kamera Tanılama Sonuçları:</strong><br>
                <pre style="text-align: left; font-size: 12px; margin: 10px 0;">${diagnosisText}</pre><br>
                <strong>Hızlı Çözüm Önerileri:</strong><br>
                • Windows Kamera uygulamasını kapatın<br>
                • Zoom, Teams, Skype gibi uygulamaları kapatın<br>
                • Tarayıcıyı yeniden başlatın<br>
                • Bilgisayarı yeniden başlatın<br><br>
                <button onclick="app.showDetailedCameraGuide()" class="btn btn-info btn-sm">Detaylı Çözüm Rehberi</button>
            `, 'info');
            
        } catch (error) {
            console.error('Kamera tanılama hatası:', error);
            this.showAlert('Kamera tanılama sırasında hata oluştu: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    // Detaylı kamera çözüm rehberi
    showDetailedCameraGuide() {
        this.showAlert(`
            <strong>Windows Kamera Erişim Sorunları - Detaylı Çözüm Rehberi</strong><br><br>
            
            <strong>1. Kamera Kullanımını Kontrol Edin:</strong><br>
            • Görev Yöneticisi'ni açın (Ctrl+Shift+Esc)<br>
            • İşlemler sekmesinde kamera kullanan uygulamaları bulun<br>
            • Windows Kamera, Zoom, Teams, Skype gibi uygulamaları kapatın<br>
            • Kamera kullanan tüm uygulamaları sonlandırın<br><br>
            
            <strong>2. Windows Kamera İzinlerini Kontrol Edin:</strong><br>
            • Windows Ayarlar > Gizlilik > Kamera<br>
            • "Uygulamaların kameraya erişmesine izin ver" seçeneğini açın<br>
            • Tarayıcınızın kamera erişimine izin verildiğini kontrol edin<br>
            • "Masaüstü uygulamalarının kameraya erişmesine izin ver" seçeneğini açın<br><br>
            
            <strong>3. Kamera Sürücülerini Güncelleyin:</strong><br>
            • Aygıt Yöneticisi'ni açın (Win+X > Aygıt Yöneticisi)<br>
            • Kameralar bölümünü genişletin<br>
            • Kamera cihazına sağ tıklayın > Sürücüyü güncelle<br>
            • Windows Update'i kontrol edin<br><br>
            
            <strong>4. Tarayıcı Ayarlarını Kontrol Edin:</strong><br>
            • Tarayıcı ayarlarında kamera izinlerini kontrol edin<br>
            • Farklı bir tarayıcı deneyin (Chrome, Edge, Firefox)<br>
            • Tarayıcıyı yeniden başlatın<br>
            • Tarayıcı önbelleğini temizleyin<br><br>
            
            <strong>5. Windows Kamera Uygulamasını Test Edin:</strong><br>
            • Windows Kamera uygulamasını açın<br>
            • Kamera çalışıyor mu kontrol edin<br>
            • Eğer çalışmıyorsa, kamera sürücülerinde sorun var demektir<br><br>
            
            <strong>6. Kaspersky Antivirüs (ÖNCELİK):</strong><br>
            • Kaspersky uygulamasını açın<br>
            • Ayarlar > Koruma > Web Kamerası Koruması<br>
            • "Web kamerası erişimini engelle" seçeneğini KAPATIN<br>
            • Tarayıcınızı "Güvenilir uygulamalar" listesine ekleyin<br>
            • Kaspersky'yi geçici olarak devre dışı bırakın (5 dakika)<br>
            • Eğer çalışırsa, kalıcı çözüm için ayarları değiştirin<br><br>
            
            <strong>7. Diğer Antivirus ve Güvenlik Yazılımları:</strong><br>
            • Antivirus yazılımının kamera erişimini engellemediğini kontrol edin<br>
            • Windows Defender'ın kamera erişimini engellemediğini kontrol edin<br>
            • Güvenlik yazılımlarının kamera erişimini engellemediğini kontrol edin<br>
            • Norton, McAfee, Avast gibi antivirüslerde benzer ayarları kontrol edin<br><br>
            
            <strong>8. Sistem Yeniden Başlatma:</strong><br>
            • Bilgisayarı yeniden başlatın<br>
            • Bu genellikle kamera erişim sorunlarını çözer<br>
            • Yeniden başlatma sonrası tekrar deneyin<br><br>
            
            <strong>9. Son Çare - Kamera Sürücüsünü Yeniden Yükleyin:</strong><br>
            • Aygıt Yöneticisi'nde kamera cihazına sağ tıklayın<br>
            • "Aygıtı kaldır" seçeneğini seçin<br>
            • Bilgisayarı yeniden başlatın<br>
            • Windows otomatik olarak sürücüyü yeniden yükleyecek<br><br>
            
            <strong>Hala Çalışmıyor mu?</strong><br>
            • Farklı bir USB portu deneyin (USB kamera ise)<br>
            • Farklı bir kamera cihazı deneyin<br>
            • Windows'u güncelleyin<br>
            • Sistem geri yükleme yapın
        `, 'info');
    }

    // Barkod tarayıcısını başlat
    async startBarcodeScanner() {
        try {
            // HTTPS kontrolü
            if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                throw new Error('Kamera erişimi için HTTPS gereklidir. Lütfen güvenli bağlantı kullanın.');
            }

            // Kamera desteği kontrolü
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Bu tarayıcı kamera erişimini desteklemiyor');
            }

            // Kamera izin durumunu kontrol et
            const permissionState = await this.checkCameraPermission();
            if (permissionState === 'denied') {
                throw new Error('Kamera izni reddedilmiş. Lütfen tarayıcı ayarlarından kamera iznini verin.');
            }

            // Önce kamera erişimini test et
            const cameraTest = await this.testCameraAccess();
            if (!cameraTest.success) {
                console.log('Kamera testi başarısız, NotReadableError çözümleri deneniyor...');
                
                // NotReadableError için özel çözüm denemeleri
                const fixResult = await this.tryFixNotReadableError();
                if (!fixResult.success) {
                    throw new Error('Kamera erişim testi başarısız. Lütfen kamera ayarlarını kontrol edin.');
                } else {
                    console.log(`NotReadableError çözümü bulundu: ${fixResult.solution}`);
                }
            } else {
                console.log('Kamera erişim testi başarılı:', cameraTest.constraints);
            }

            // Mevcut kameraları listele
            const cameras = await this.getAvailableCameras();
            if (cameras.length === 0) {
                throw new Error('Hiç kamera cihazı bulunamadı.');
            }

            console.log(`${cameras.length} kamera cihazı bulundu`);

            const scannerDiv = document.getElementById('barcodeScanner');
            scannerDiv.style.display = 'block';

            // Mobil cihaz kontrolü
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Farklı kamera constraints'leri dene
            const constraintOptions = [
                // İlk seçenek: Yüksek kalite
                {
                    video: {
                        facingMode: isMobile ? 'environment' : 'user',
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 },
                        frameRate: { ideal: 30, min: 15 }
                    }
                },
                // İkinci seçenek: Orta kalite
                {
                    video: {
                        facingMode: isMobile ? 'environment' : 'user',
                        width: { ideal: 640, min: 320 },
                        height: { ideal: 480, min: 240 },
                        frameRate: { ideal: 15, min: 10 }
                    }
                },
                // Üçüncü seçenek: Düşük kalite
                {
                    video: {
                        facingMode: isMobile ? 'environment' : 'user',
                        width: { min: 320 },
                        height: { min: 240 }
                    }
                },
                // Dördüncü seçenek: Sadece facingMode
                {
                    video: {
                        facingMode: isMobile ? 'environment' : 'user'
                    }
                },
                // Beşinci seçenek: Hiç constraint yok
                {
                    video: true
                }
            ];

            let stream = null;
            let lastError = null;

            // Her constraint seçeneğini dene
            for (let i = 0; i < constraintOptions.length; i++) {
                try {
                    console.log(`Kamera constraints deneniyor (${i + 1}/${constraintOptions.length}):`, constraintOptions[i]);
                    stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
                    console.log(`Kamera erişimi başarılı (seçenek ${i + 1})`);
                    break;
                } catch (error) {
                    console.log(`Constraint seçeneği ${i + 1} başarısız:`, error.name, error.message);
                    lastError = error;
                    continue;
                }
            }

            if (!stream) {
                throw lastError || new Error('Tüm kamera constraint seçenekleri başarısız oldu');
            }

            const video = document.getElementById('scannerVideo');
            video.srcObject = stream;

            // QuaggaJS kontrolü
            if (typeof Quagga === 'undefined') {
                throw new Error('QuaggaJS kütüphanesi yüklenemedi');
            }

            // QuaggaJS ile barkod tarama (Web Worker hatası için optimize edildi)
            const quaggaConfig = {
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: video,
                    constraints: {
                        width: { ideal: 1280, min: 320 },
                        height: { ideal: 720, min: 240 },
                        facingMode: isMobile ? 'environment' : 'user'
                    }
                },
                decoder: {
                    readers: [
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader",
                        "code_39_reader",
                        "upc_reader",
                        "upc_e_reader"
                    ]
                },
                locate: true,
                locator: {
                    patchSize: isMobile ? "large" : "medium",
                    halfSample: true
                },
                numOfWorkers: 0, // Web Worker hatası için devre dışı bırakıldı
                frequency: 10
            };

            console.log('QuaggaJS başlatılıyor...', quaggaConfig);

            Quagga.init(quaggaConfig, (err) => {
                if (err) {
                    console.error('QuaggaJS başlatma hatası:', err);
                    this.showAlert('Barkod tarayıcısı başlatılamadı: ' + err.message, 'danger');
                    this.stopBarcodeScanner();
                    return;
                }
                // QuaggaJS başarıyla başlatıldı
                Quagga.start();
            });

            // Barkod bulunduğunda (optimize edildi)
            let lastDetectedCode = null;
            let detectionCount = 0;
            
            Quagga.onDetected((data) => {
                try {
                    if (data && data.codeResult && data.codeResult.code) {
                        const code = data.codeResult.code;
                        
                        // Aynı barkodun tekrar tekrar algılanmasını önle
                        if (lastDetectedCode === code) {
                            detectionCount++;
                            if (detectionCount < 3) {
                                return; // En az 3 kez algılanana kadar bekle
                            }
                        } else {
                            lastDetectedCode = code;
                            detectionCount = 1;
                            return;
                        }
                        
                        console.log('Barkod algılandı:', code);
                        
                        // Barkod bulundu
                        this.stopBarcodeScanner();
                        this.searchMedicineByBarcode(code);
                    }
                } catch (error) {
                    console.error('Barkod işleme hatası:', error);
                }
            });

            // Görsel iyileştirme (optimize edildi)
            let frameCount = 0;
            Quagga.onProcessed((result) => {
                try {
                    frameCount++;
                    
                    // Her 5 frame'de bir görsel güncelleme (performans için)
                    if (frameCount % 5 !== 0) return;
                    
                    if (result && result.boxes && Quagga.canvas && Quagga.canvas.ctx && Quagga.canvas.ctx.overlay) {
                        const drawingCtx = Quagga.canvas.ctx.overlay;
                        const drawingCanvas = Quagga.canvas.dom.overlay;
                        
                        if (drawingCanvas) {
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
                    }
                } catch (error) {
                    // Görsel iyileştirme hatası önemsiz
                }
            });

        } catch (error) {
            console.error('Kamera erişim hatası:', error);
            let errorMessage = 'Kamera erişimi reddedildi veya mevcut değil';
            let errorType = 'danger';
            
            if (error.name === 'NotAllowedError') {
                errorMessage = 'Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Kamera bulunamadı. Lütfen cihazınızda kamera olduğundan emin olun.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage = 'Bu tarayıcı kamera erişimini desteklemiyor.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = `
                    <strong>Kamera Erişim Sorunu:</strong><br>
                    Kamera başka bir uygulama tarafından kullanılıyor olabilir.<br><br>
                    <strong>Çözüm önerileri:</strong><br>
                    • Diğer kamera kullanan uygulamaları kapatın (Zoom, Teams, Skype vb.)<br>
                    • Windows Kamera uygulamasını kapatın<br>
                    • Tarayıcıyı yenileyin ve tekrar deneyin<br>
                    • Kamera sürücülerini kontrol edin<br>
                    • "Kamera Sorunlarını Tespit Et" butonunu kullanın
                `;
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Kamera ayarları desteklenmiyor. Farklı bir kamera deneyin.';
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Güvenlik hatası. HTTPS bağlantısı gereklidir.';
            } else if (error.message.includes('QuaggaJS')) {
                errorMessage = 'Barkod tarayıcı kütüphanesi yüklenemedi. Sayfayı yenileyin.';
            } else if (error.message.includes('HTTPS')) {
                errorMessage = error.message;
                errorType = 'warning';
            } else if (error.message.includes('izin')) {
                errorMessage = error.message;
            } else if (error.message.includes('testi başarısız')) {
                errorMessage = `
                    <strong>Kamera Test Hatası:</strong><br>
                    Kamera erişim testi başarısız oldu.<br><br>
                    <strong>Çözüm önerileri:</strong><br>
                    • "NotReadableError Çözümü Dene" butonunu kullanın<br>
                    • Kamera sürücülerini güncelleyin<br>
                    • Cihazı yeniden başlatın<br>
                    • "Kamera Sorunlarını Tespit Et" butonunu kullanın
                `;
            } else if (error.message.includes('Hiç kamera cihazı')) {
                errorMessage = `
                    <strong>Kamera Cihazı Bulunamadı:</strong><br>
                    Sistemde hiç kamera cihazı bulunamadı.<br><br>
                    <strong>Çözüm önerileri:</strong><br>
                    • Kamera bağlantısını kontrol edin<br>
                    • Kamera sürücülerini yükleyin/güncelleyin<br>
                    • Cihaz Yöneticisi'nde kamera durumunu kontrol edin
                `;
            }
            
            // Detaylı hata bilgisi için console'a log ekle
            console.log('Hata detayları:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            this.showAlert(errorMessage, errorType);
            this.stopBarcodeScanner();
        }
    }

    // Elle barkod numarası ile ilaç ara
    async searchMedicineByManualBarcode() {
        try {
            const barcodeInput = document.getElementById('manualBarcodeInput');
            const barcode = barcodeInput.value.trim();
            
            if (!barcode) {
                this.showAlert('Lütfen barkod numarasını girin', 'warning');
                return;
            }
            
            // Barkod validasyonu
            if (!/^\d+$/.test(barcode)) {
                this.showAlert('Barkod numarası sadece rakamlardan oluşmalıdır', 'warning');
                return;
            }
            
            if (barcode.length < 8 || barcode.length > 20) {
                this.showAlert('Barkod numarası 8-20 karakter arasında olmalıdır', 'warning');
                return;
            }
            
            console.log('Elle girilen barkod:', barcode);
            
            // Barkod tarayıcısını durdur
            this.stopBarcodeScanner();
            
            // İlaç ara
            await this.searchMedicineByBarcode(barcode);
            
            // Input alanını temizle
            barcodeInput.value = '';
            
        } catch (error) {
            console.error('Elle barkod arama hatası:', error);
            this.showAlert('Elle barkod arama sırasında hata oluştu: ' + error.message, 'danger');
        }
    }

    // Elle barkod input alanına Enter tuşu desteği ekle
    setupManualBarcodeInput() {
        const barcodeInput = document.getElementById('manualBarcodeInput');
        if (barcodeInput) {
            barcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchMedicineByManualBarcode();
                }
            });
        }
    }

    // Elle barkod girme modalını göster
    showManualBarcodeInput() {
        const modalHtml = `
            <div class="modal fade" id="manualBarcodeModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-keyboard me-2"></i>
                                Elle Barkod Gir
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                <strong>Türkiye Barkod Formatları:</strong><br>
                                • <strong>GTIN-14:</strong> 14 haneli (869... ile başlar)<br>
                                • <strong>EAN-13:</strong> 13 haneli<br>
                                • <strong>EAN-8:</strong> 8 haneli<br>
                                • <strong>UPC:</strong> 12 haneli
                            </div>
                            
                            <div class="mb-3">
                                <label class="form-label">
                                    <i class="fas fa-barcode me-2"></i>
                                    Barkod Numarası
                                </label>
                                <input type="text" 
                                       id="manualBarcodeModalInput" 
                                       class="form-control form-control-lg text-center" 
                                       placeholder="Barkod numarasını girin..." 
                                       maxlength="20"
                                       style="font-family: monospace; font-size: 18px;">
                                <div class="form-text">
                                    Sadece rakam girin. Tire (-) ve boşluk otomatik temizlenecek.
                                </div>
                            </div>
                            
                            <div class="alert alert-warning">
                                <i class="fas fa-lightbulb me-2"></i>
                                <strong>İpucu:</strong> Barkod numarasını ilaç kutusunun üzerinden bulabilirsiniz. 
                                Genellikle kutunun altında veya yanında yer alır.
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>İptal
                            </button>
                            <button type="button" class="btn btn-primary" onclick="app.searchMedicineByManualBarcodeModal()">
                                <i class="fas fa-search me-2"></i>İlaç Ara
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Eski modal'ı kaldır
        const existingModal = document.getElementById('manualBarcodeModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Yeni modal'ı ekle
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Modal'ı göster
        const modal = new bootstrap.Modal(document.getElementById('manualBarcodeModal'));
        modal.show();
        
        // Input'a odaklan
        setTimeout(() => {
            const input = document.getElementById('manualBarcodeModalInput');
            if (input) {
                input.focus();
                
                // Enter tuşu desteği
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.searchMedicineByManualBarcodeModal();
                    }
                });
                
                // Sadece rakam girişi
                input.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/[^0-9]/g, '');
                });
            }
        }, 500);
    }

    // Modal'dan elle barkod arama
    async searchMedicineByManualBarcodeModal() {
        try {
            const barcodeInput = document.getElementById('manualBarcodeModalInput');
            const barcode = barcodeInput.value.trim();
            
            if (!barcode) {
                this.showAlert('Lütfen barkod numarasını girin', 'warning');
                return;
            }
            
            // Barkod validasyonu
            if (!/^\d+$/.test(barcode)) {
                this.showAlert('Barkod numarası sadece rakamlardan oluşmalıdır', 'warning');
                return;
            }
            
            if (barcode.length < 8 || barcode.length > 20) {
                this.showAlert('Barkod numarası 8-20 karakter arasında olmalıdır', 'warning');
                return;
            }
            
            console.log('Modal\'dan girilen barkod:', barcode);
            
            // Modal'ı kapat
            const modal = bootstrap.Modal.getInstance(document.getElementById('manualBarcodeModal'));
            if (modal) {
                modal.hide();
            }
            
            // İlaç ara
            await this.searchMedicineByBarcode(barcode);
            
        } catch (error) {
            console.error('Modal elle barkod arama hatası:', error);
            this.showAlert('Elle barkod arama sırasında hata oluştu: ' + error.message, 'danger');
        }
    }

    // Barkod tarayıcısını durdur
    stopBarcodeScanner() {
        try {
            console.log('Barkod tarayıcısı durduruluyor...');
            
            const scannerDiv = document.getElementById('barcodeScanner');
            if (scannerDiv) {
                scannerDiv.style.display = 'none';
            }

            const video = document.getElementById('scannerVideo');
            if (video && video.srcObject) {
                const tracks = video.srcObject.getTracks();
                tracks.forEach(track => {
                    try {
                        track.stop();
                        console.log('Kamera track durduruldu:', track.label);
                    } catch (e) {
                        // Track zaten durmuş olabilir
                        console.log('Track zaten durmuş:', e.message);
                    }
                });
                video.srcObject = null;
            }

            // QuaggaJS'i güvenli şekilde durdur
            if (typeof Quagga !== 'undefined' && Quagga) {
                try {
                    Quagga.stop();
                    // Event listener'ları temizle
                    Quagga.offDetected();
                    Quagga.offProcessed();
                    console.log('QuaggaJS durduruldu');
                } catch (e) {
                    // Quagga zaten durmuş olabilir
                    console.log('QuaggaJS zaten durmuş:', e.message);
                }
            }
            
            // Kamera izin durumunu tekrar kontrol et
            setTimeout(() => {
                this.showCameraPermissionInfo();
            }, 1000);
            
        } catch (error) {
            console.error('Barkod tarayıcısı durdurma hatası:', error);
        }
    }

    // Barkod ile ilaç ara
    async searchMedicineByBarcode(barcode) {
        try {
            this.showLoading(true);
            
            // Debug: Token kontrolü
            const token = localStorage.getItem('authToken');
            console.log('Barkod arama için token:', token ? 'Mevcut' : 'Yok');
            
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
                    await this.showMedicineDetailsFromAPI(response.data, response.api_info);
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

    sanitizeInput(value) {
        if (value === null || value === undefined) return null;
        const trimmed = value.toString().trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    normalizeBarcodeInput(value) {
        const sanitized = this.sanitizeInput(value);
        if (!sanitized) return null;
        return sanitized.replace(/[^0-9A-Za-z]/g, '');
    }

    escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return value
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    parseInteger(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = parseInt(value, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }

    parseFloatValue(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = parseFloat(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    async ensureMedicinesLoaded() {
        if (!Array.isArray(this.medicines) || this.medicines.length === 0) {
            await this.loadMedicines();
        }
    }

    async ensureStocksLoaded() {
        if (!Array.isArray(this.stocks) || this.stocks.length === 0) {
            await this.loadStocks();
        }
    }

    findMedicineById(id) {
        if (!Array.isArray(this.medicines)) return null;
        return this.medicines.find(medicine => medicine.id === Number(id));
    }

    findMedicineByBarcode(barcode) {
        if (!Array.isArray(this.medicines)) return null;
        return this.medicines.find(medicine => medicine.barcode === barcode);
    }

    findStockById(id) {
        if (!Array.isArray(this.stocks)) return null;
        return this.stocks.find(stock => stock.id === Number(id));
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
            'expired': 'Süresi Geçmiş',
            'unknown': 'Bilinmiyor'
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
    async showAddMedicineForm(existingMedicine = null) {
        try {
            const isEdit = Boolean(existingMedicine && existingMedicine.id);
            const medicineData = existingMedicine || {};
            const modalId = 'medicineFormModal';
            const formId = 'medicineForm';
            const title = isEdit ? 'İlaç Bilgilerini Güncelle' : 'Yeni İlaç Ekle';

            const barcodeValue = this.escapeHtml(medicineData.barcode || '');
            const nameValue = this.escapeHtml(medicineData.name || '');
            const activeIngredientValue = this.escapeHtml(medicineData.activeIngredient || medicineData.active_ingredient || '');
            const manufacturerValue = this.escapeHtml(medicineData.manufacturer || '');
            const dosageFormValue = this.escapeHtml(medicineData.dosageForm || medicineData.dosage_form || '');
            const strengthValue = this.escapeHtml(medicineData.strength || '');
            const packageSizeValue = this.escapeHtml(medicineData.packageSize || medicineData.package_size || '');
            const descriptionValue = this.escapeHtml(medicineData.description || '');

            const content = `
                <form id="${formId}" class="needs-validation" novalidate>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label">Barkod <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="barcode" value="${barcodeValue}" ${isEdit ? 'readonly' : ''} required>
                            <div class="form-text">Sadece rakam ve harf giriniz.</div>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">İlaç Adı <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" name="name" value="${nameValue}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Etken Madde</label>
                            <input type="text" class="form-control" name="activeIngredient" value="${activeIngredientValue}">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Üretici</label>
                            <input type="text" class="form-control" name="manufacturer" value="${manufacturerValue}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Dozaj Formu</label>
                            <input type="text" class="form-control" name="dosageForm" value="${dosageFormValue}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Güç</label>
                            <input type="text" class="form-control" name="strength" value="${strengthValue}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Paket Boyutu</label>
                            <input type="text" class="form-control" name="packageSize" value="${packageSizeValue}">
                        </div>
                        <div class="col-12">
                            <label class="form-label">Açıklama</label>
                            <textarea class="form-control" name="description" rows="3">${descriptionValue}</textarea>
                        </div>
                    </div>
                </form>
            `;

            const footer = `
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-2"></i>İptal
                </button>
                <button type="submit" form="${formId}" class="btn btn-primary">
                    <i class="fas fa-save me-2"></i>${isEdit ? 'Güncelle' : 'Kaydet'}
                </button>
            `;

            const modalInstance = this.showModal(title, content, {
                id: modalId,
                size: 'modal-lg',
                footer,
                backdrop: 'static'
            });

            const modalElement = document.getElementById(modalId);
            const formElement = modalElement.querySelector(`#${formId}`);
            const submitButton = modalElement.querySelector('button[type="submit"]');

            formElement.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (submitButton) submitButton.disabled = true;

                try {
                    const formData = new FormData(formElement);
                    const barcode = this.normalizeBarcodeInput(formData.get('barcode'));
                    const name = this.sanitizeInput(formData.get('name'));

                    if (!barcode || barcode.length < 8) {
                        this.showAlert('Barkod en az 8 karakter olmalıdır.', 'warning');
                        if (submitButton) submitButton.disabled = false;
                        return;
                    }

                    if (!name) {
                        this.showAlert('İlaç adı zorunludur.', 'warning');
                        if (submitButton) submitButton.disabled = false;
                        return;
                    }

                    const payload = {
                        name,
                        activeIngredient: this.sanitizeInput(formData.get('activeIngredient')),
                        manufacturer: this.sanitizeInput(formData.get('manufacturer')),
                        dosageForm: this.sanitizeInput(formData.get('dosageForm')),
                        strength: this.sanitizeInput(formData.get('strength')),
                        packageSize: this.sanitizeInput(formData.get('packageSize')),
                        description: this.sanitizeInput(formData.get('description'))
                    };

                    if (!isEdit) {
                        payload.barcode = barcode;
                    }

                    const endpoint = isEdit ? `/medicines/${medicineData.id}` : '/medicines';
                    const method = isEdit ? 'PUT' : 'POST';

                    await this.apiCall(endpoint, {
                        method,
                        body: JSON.stringify(payload),
                        silent: true
                    });

                    this.showAlert(`İlaç başarıyla ${isEdit ? 'güncellendi' : 'eklendi'}.`, 'success');
                    modalInstance.hide();

                    await this.loadMedicines();
                    await this.loadDashboard();
                } catch (error) {
                    console.error('İlaç kaydetme hatası:', error);
                    this.showAlert(`İlaç ${isEdit ? 'güncellenemedi' : 'eklenemedi'}: ${error.message}`, 'danger');
                } finally {
                    if (submitButton) submitButton.disabled = false;
                }
            });
        } catch (error) {
            console.error('İlaç formu hazırlama hatası:', error);
            this.showAlert('İlaç formu hazırlanırken hata oluştu.', 'danger');
        }
    }

    async openStockForm(options = {}) {
        const { existingStock = null, preselectedMedicineId = null, preselectedBarcode = null } = options;
        try {
            await this.ensureMedicinesLoaded();

            if (!Array.isArray(this.medicines) || this.medicines.length === 0) {
                this.showAlert('Önce en az bir ilaç eklemelisiniz.', 'warning');
                this.showAddMedicineForm();
                return;
            }

            const isEdit = Boolean(existingStock && existingStock.id);
            let selectedMedicineId = preselectedMedicineId || null;

            if (!selectedMedicineId && preselectedBarcode) {
                const matched = this.findMedicineByBarcode(preselectedBarcode);
                if (matched) {
                    selectedMedicineId = matched.id;
                }
            }

            if (!selectedMedicineId && isEdit) {
                selectedMedicineId = existingStock.medicineId || existingStock.medicine_id || null;
            }

            if (!selectedMedicineId && this.medicines.length > 0) {
                selectedMedicineId = this.medicines[0].id;
            }

            const stockData = existingStock || {};
            const quantityValue = stockData.quantity ?? '';
            const purchaseDateValue = this.escapeHtml(stockData.purchaseDate || stockData.purchase_date || '');
            const expiryDateValue = this.escapeHtml(stockData.expiryDate || stockData.expiry_date || '');
            const purchasePriceValue = stockData.purchasePrice !== undefined ? stockData.purchasePrice : (stockData.purchase_price !== undefined ? stockData.purchase_price : '');
            const locationValue = this.escapeHtml(stockData.location || '');
            const notesValue = this.escapeHtml(stockData.notes || '');

            const medicineOptions = this.medicines.map(medicine => `
                <option value="${medicine.id}" ${medicine.id === selectedMedicineId ? 'selected' : ''}>
                    ${this.escapeHtml(medicine.name)} ${medicine.barcode ? `(${this.escapeHtml(medicine.barcode)})` : ''}
                </option>
            `).join('');

            const modalId = 'stockFormModal';
            const formId = 'stockForm';
            const title = isEdit ? 'Stok Bilgilerini Güncelle' : 'Yeni Stok Ekle';

            const content = `
                <form id="${formId}" class="needs-validation" novalidate>
                    <div class="row g-3">
                        <div class="col-md-12">
                            <label class="form-label">İlaç <span class="text-danger">*</span></label>
                            ${isEdit ? `<input type="hidden" name="medicineId" value="${selectedMedicineId || ''}">` : ''}
                            <select class="form-select" name="medicineId" ${isEdit ? 'disabled' : ''} required>
                                <option value="">İlaç seçin...</option>
                                ${medicineOptions}
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Miktar <span class="text-danger">*</span></label>
                            <input type="number" min="1" class="form-control" name="quantity" value="${quantityValue}" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Satın Alma Tarihi</label>
                            <input type="date" class="form-control" name="purchaseDate" value="${purchaseDateValue}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Son Kullanım Tarihi <span class="text-danger">*</span></label>
                            <input type="date" class="form-control" name="expiryDate" value="${expiryDateValue}" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Satın Alma Fiyatı (₺)</label>
                            <input type="number" step="0.01" min="0" class="form-control" name="purchasePrice" value="${purchasePriceValue ?? ''}">
                        </div>
                        <div class="col-md-8">
                            <label class="form-label">Saklama Konumu</label>
                            <input type="text" class="form-control" name="location" value="${locationValue}">
                        </div>
                        <div class="col-12">
                            <label class="form-label">Notlar</label>
                            <textarea class="form-control" name="notes" rows="3">${notesValue}</textarea>
                        </div>
                    </div>
                </form>
            `;

            const footer = `
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-2"></i>İptal
                </button>
                <button type="submit" form="${formId}" class="btn btn-primary">
                    <i class="fas fa-save me-2"></i>${isEdit ? 'Güncelle' : 'Kaydet'}
                </button>
            `;

            const modalInstance = this.showModal(title, content, {
                id: modalId,
                size: 'modal-lg',
                footer,
                backdrop: 'static'
            });

            const modalElement = document.getElementById(modalId);
            const formElement = modalElement.querySelector(`#${formId}`);
            const submitButton = modalElement.querySelector('button[type="submit"]');

            formElement.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (submitButton) submitButton.disabled = true;

                try {
                    const formData = new FormData(formElement);
                    const resolvedMedicineId = isEdit
                        ? (stockData.medicineId || stockData.medicine_id || selectedMedicineId)
                        : this.parseInteger(formData.get('medicineId'));
                    const quantity = this.parseInteger(formData.get('quantity'));
                    const purchaseDate = this.sanitizeInput(formData.get('purchaseDate'));
                    const expiryDate = this.sanitizeInput(formData.get('expiryDate'));
                    const purchasePrice = this.parseFloatValue(formData.get('purchasePrice'));
                    const location = this.sanitizeInput(formData.get('location'));
                    const notes = this.sanitizeInput(formData.get('notes'));

                    if (!resolvedMedicineId) {
                        this.showAlert('Lütfen bir ilaç seçin.', 'warning');
                        if (submitButton) submitButton.disabled = false;
                        return;
                    }

                    if (!quantity || quantity <= 0) {
                        this.showAlert('Miktar pozitif bir sayı olmalıdır.', 'warning');
                        if (submitButton) submitButton.disabled = false;
                        return;
                    }

                    if (!expiryDate) {
                        this.showAlert('Son kullanım tarihi zorunludur.', 'warning');
                        if (submitButton) submitButton.disabled = false;
                        return;
                    }

                    const payload = {
                        quantity,
                        expiryDate
                    };

                    if (!isEdit) {
                        payload.medicineId = resolvedMedicineId;
                    }

                    if (purchaseDate) payload.purchaseDate = purchaseDate;
                    if (purchasePrice !== null) payload.purchasePrice = purchasePrice;
                    if (location) payload.location = location;
                    if (notes) payload.notes = notes;

                    const endpoint = isEdit ? `/stocks/${stockData.id}` : '/stocks';
                    const method = isEdit ? 'PUT' : 'POST';

                    await this.apiCall(endpoint, {
                        method,
                        body: JSON.stringify(payload),
                        silent: true
                    });

                    this.showAlert(`Stok başarıyla ${isEdit ? 'güncellendi' : 'eklendi'}.`, 'success');
                    modalInstance.hide();

                    await this.loadStocks();
                    await this.loadDashboard();
                } catch (error) {
                    console.error('Stok kaydetme hatası:', error);
                    this.showAlert(`Stok ${isEdit ? 'güncellenemedi' : 'eklenemedi'}: ${error.message}`, 'danger');
                } finally {
                    if (submitButton) submitButton.disabled = false;
                }
            });
        } catch (error) {
            console.error('Stok formu hazırlama hatası:', error);
            this.showAlert('Stok formu hazırlanırken hata oluştu.', 'danger');
        }
    }

    async showAddStockForm(reference = null) {
        const options = {};

        if (reference !== null && reference !== undefined) {
            if (typeof reference === 'number') {
                options.preselectedMedicineId = reference;
            } else if (typeof reference === 'string') {
                const numericValue = Number(reference);
                if (!Number.isNaN(numericValue) && numericValue > 0 && numericValue < 1000000) {
                    options.preselectedMedicineId = numericValue;
                } else {
                    options.preselectedBarcode = reference;
                }
            }
        }

        await this.openStockForm(options);
    }

    async showMedicineDetailsFromAPI(medicineData, apiInfo = null) {
        try {
            // API'den gelen ilaç verisini direkt göster
            let detailsHtml = `
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-pills me-2"></i>İlaç Detayları</h5>
                    </div>
                    <div class="card-body">
                        <h6><strong>${medicineData.name}</strong></h6>
                        <p><strong>Barkod:</strong> ${medicineData.barcode}</p>
            `;
                
                if (medicineData.active_ingredient) {
                    detailsHtml += `<p><strong>Etken Madde:</strong> ${medicineData.active_ingredient}</p>`;
                }
                
                if (medicineData.manufacturer) {
                    detailsHtml += `<p><strong>Üretici:</strong> ${medicineData.manufacturer}</p>`;
                }
                
                if (medicineData.dosage_form) {
                    detailsHtml += `<p><strong>Dozaj Formu:</strong> ${medicineData.dosage_form}</p>`;
                }
                
                if (medicineData.strength) {
                    detailsHtml += `<p><strong>Güçlü:</strong> ${medicineData.strength}</p>`;
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
                            <button class="btn btn-primary me-2" onclick="app.showAddStockForm('${medicineData.barcode}')">
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
        } catch (error) {
            console.error('İlaç detayları hatası:', error);
            this.showAlert('İlaç detayları gösterilemedi', 'danger');
        }
    }

    showModal(title, content, options = {}) {
        const {
            id = 'medicineModal',
            size = 'modal-lg',
            footer = '',
            backdrop = true,
            keyboard = true
        } = options;

        const attributeExtras = backdrop === 'static' ? ' data-bs-backdrop="static" data-bs-keyboard="false"' : '';
        const modalHtml = `
            <div class="modal fade" id="${id}" tabindex="-1"${attributeExtras}>
                <div class="modal-dialog ${size}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Aynı ID'ye sahip eski modal'ı kaldır
        const existingModal = document.getElementById(id);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalContainer = document.getElementById('modalsContainer') || document.body;
        modalContainer.insertAdjacentHTML('beforeend', modalHtml);
        
        const modalElement = document.getElementById(id);
        const modalInstance = new bootstrap.Modal(modalElement, {
            backdrop,
            keyboard: backdrop === 'static' ? false : keyboard
        });
        
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
            if (this.activeModalId === id) {
                this.activeModalId = null;
            }
        }, { once: true });
        
        this.activeModalId = id;
        modalInstance.show();
        return modalInstance;
    }

    closeModal(modalId = null) {
        const targetId = modalId || this.activeModalId || 'medicineModal';
        const modalElement = document.getElementById(targetId);
        if (!modalElement) return;

        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
            modalInstance.hide();
        } else {
            modalElement.remove();
        }

        if (this.activeModalId === targetId) {
            this.activeModalId = null;
        }
    }

    async editMedicine(medicineId) {
        try {
            await this.ensureMedicinesLoaded();
            const medicine = this.findMedicineById(medicineId);

            if (!medicine) {
                this.showAlert('İlaç bulunamadı. Listeyi yenilemeyi deneyin.', 'warning');
                await this.loadMedicines();
                return;
            }

            this.showAddMedicineForm(medicine);
        } catch (error) {
            console.error('İlaç düzenleme hatası:', error);
            this.showAlert('İlaç düzenleme formu hazırlanırken hata oluştu.', 'danger');
        }
    }

    async deleteMedicine(medicineId) {
        if (!confirm('Bu ilacı silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            await this.apiCall(`/medicines/${medicineId}`, {
                method: 'DELETE',
                silent: true
            });
            this.showAlert('İlaç başarıyla silindi.', 'success');
            await this.loadMedicines();
            await this.loadStocks();
            await this.loadDashboard();
        } catch (error) {
            console.error('İlaç silme hatası:', error);
            this.showAlert('İlaç silinemedi: ' + error.message, 'danger');
        }
    }

    async showStockDetails(stockId) {
        try {
            await this.ensureStocksLoaded();
            const stock = this.findStockById(stockId);

            if (!stock) {
                this.showAlert('Stok kaydı bulunamadı. Listeyi yenilemeyi deneyin.', 'warning');
                await this.loadStocks();
                return;
            }

            const content = `
                <div class="card">
                    <div class="card-body">
                        <div class="mb-3">
                            <strong>İlaç:</strong> ${this.escapeHtml(stock.medicineName || 'Bilinmiyor')}
                        </div>
                        <div class="mb-3">
                            <strong>Barkod:</strong> ${this.escapeHtml(stock.barcode || '-')}
                        </div>
                        <div class="mb-3">
                            <strong>Miktar:</strong> ${stock.quantity}
                        </div>
                        <div class="mb-3">
                            <strong>Son Kullanım Tarihi:</strong> ${stock.expiryDate ? this.formatDate(stock.expiryDate) : '-'}
                        </div>
                        <div class="mb-3">
                            <strong>Satın Alma Tarihi:</strong> ${stock.purchaseDate ? this.formatDate(stock.purchaseDate) : '-'}
                        </div>
                        <div class="mb-3">
                            <strong>Satın Alma Fiyatı:</strong> ${stock.purchasePrice !== null && stock.purchasePrice !== undefined ? `${stock.purchasePrice} ₺` : '-'}
                        </div>
                        <div class="mb-3">
                            <strong>Konum:</strong> ${this.escapeHtml(stock.location || '-')}
                        </div>
                        <div class="mb-3">
                            <strong>Durum:</strong> ${this.getStatusText(stock.status || 'unknown')}
                        </div>
                        <div class="mb-3">
                            <strong>Notlar:</strong><br>${this.escapeHtml(stock.notes || '-')}
                        </div>
                    </div>
                </div>
            `;

            const footer = `
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                    <i class="fas fa-times me-2"></i>Kapat
                </button>
                <button type="button" class="btn btn-primary" onclick="app.editStock(${stock.id})">
                    <i class="fas fa-edit me-2"></i>Düzenle
                </button>
            `;

            this.showModal('Stok Detayları', content, { footer });
        } catch (error) {
            console.error('Stok detayları hatası:', error);
            this.showAlert('Stok detayları gösterilemedi.', 'danger');
        }
    }

    async editStock(stockId) {
        try {
            await this.ensureStocksLoaded();
            const stock = this.findStockById(stockId);

            if (!stock) {
                this.showAlert('Stok kaydı bulunamadı. Listeyi yenilemeyi deneyin.', 'warning');
                await this.loadStocks();
                return;
            }

            await this.openStockForm({ existingStock: stock });
        } catch (error) {
            console.error('Stok düzenleme hatası:', error);
            this.showAlert('Stok düzenleme formu hazırlanırken hata oluştu.', 'danger');
        }
    }

    async deleteStock(stockId) {
        if (!confirm('Bu stoku silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            await this.apiCall(`/stocks/${stockId}`, {
                method: 'DELETE',
                silent: true
            });
            this.showAlert('Stok başarıyla silindi.', 'success');
            await this.loadStocks();
            await this.loadDashboard();
        } catch (error) {
            console.error('Stok silme hatası:', error);
            this.showAlert('Stok silinemedi: ' + error.message, 'danger');
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

    async deleteAlert(alertId) {
        if (!confirm('Bu uyarıyı silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            await this.apiCall(`/alerts/${alertId}`, {
                method: 'DELETE',
                silent: true
            });
            this.showAlert('Uyarı başarıyla silindi.', 'success');
            await this.loadAlerts();
            await this.loadDashboard();
        } catch (error) {
            console.error('Uyarı silme hatası:', error);
            this.showAlert('Uyarı silinemedi: ' + error.message, 'danger');
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

// Elle barkod arama fonksiyonu
function searchMedicineByManualBarcode() {
    app.searchMedicineByManualBarcode();
}

// Elle barkod girme modalını göster
function showManualBarcodeInput() {
    app.showManualBarcodeInput();
}

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Hata mesajını gizle
});

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

// Form event listeners
document.addEventListener('DOMContentLoaded', () => {
    // DOM loaded, initializing app
    
    // App'i başlat
    try {
        app = new MedicineStorageApp();
        
        // Elle barkod input alanını ayarla
        app.setupManualBarcodeInput();
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
