// Authentication JavaScript
class AuthManager {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('registerFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    checkExistingAuth() {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                console.log('Existing token found, redirecting to dashboard');
                // Token varsa ana sayfaya yönlendir
                window.location.href = '/dashboard';
            }
        } catch (error) {
            console.error('Auth check error:', error);
            // Hata durumunda token'ları temizle
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }
    }

    async handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showAlert('loginAlert', 'Kullanıcı adı ve şifre gerekli', 'danger');
            return;
        }

        try {
            this.showLoading('loginLoading', true);
            this.hideAlert('loginAlert');

            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Token'ı kaydet
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.showAlert('loginAlert', 'Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
                
                // Ana sayfaya yönlendir
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                this.showAlert('loginAlert', data.message || 'Giriş başarısız', 'danger');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAlert('loginAlert', 'Giriş sırasında hata oluştu', 'danger');
        } finally {
            this.showLoading('loginLoading', false);
        }
    }

    async handleRegister() {
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        if (!firstName || !lastName || !username || !email || !password) {
            this.showAlert('registerAlert', 'Tüm alanlar zorunludur', 'danger');
            return;
        }

        if (password.length < 6) {
            this.showAlert('registerAlert', 'Şifre en az 6 karakter olmalıdır', 'danger');
            return;
        }

        try {
            this.showLoading('registerLoading', true);
            this.hideAlert('registerAlert');

            const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    firstName,
                    lastName,
                    username,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {
                // Token'ı kaydet
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                this.showAlert('registerAlert', 'Hesap başarıyla oluşturuldu! Yönlendiriliyorsunuz...', 'success');
                
                // Ana sayfaya yönlendir
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                this.showAlert('registerAlert', data.message || 'Hesap oluşturulamadı', 'danger');
            }
        } catch (error) {
            console.error('Register error:', error);
            this.showAlert('registerAlert', 'Hesap oluşturulurken hata oluştu', 'danger');
        } finally {
            this.showLoading('registerLoading', false);
        }
    }

    showAlert(alertId, message, type) {
        const alert = document.getElementById(alertId);
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.display = 'block';
    }

    hideAlert(alertId) {
        const alert = document.getElementById(alertId);
        alert.style.display = 'none';
    }

    showLoading(loadingId, show) {
        const loading = document.getElementById(loadingId);
        loading.style.display = show ? 'block' : 'none';
    }
}

// Form göster/gizle fonksiyonları
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
