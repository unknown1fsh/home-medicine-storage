# Evdeki İlaç Depom

Profesyonel düzeyde evdeki ilaç deponuzu yönetmenizi sağlayan web uygulaması. Kullanıcı bazlı sistem, admin paneli, barkod/karekod okuma, son kullanım tarihi takibi ve uyarı sistemi ile ilaçlarınızı güvenle saklayın.

## 🚀 Özellikler

### 👤 Kullanıcı Sistemi
- **Kullanıcı Kayıt/Giriş**: Güvenli JWT tabanlı authentication
- **Profil Yönetimi**: Kişisel bilgileri güncelleme ve şifre değiştirme
- **Kullanıcı Bazlı Veri**: Her kullanıcının kendi ilaç ve stok verileri

### 🔐 Admin Paneli
- **Kullanıcı Yönetimi**: Tüm kullanıcıları görüntüleme ve yönetme
- **Rol Yönetimi**: Kullanıcı rollerini değiştirme (User/Admin)
- **Durum Kontrolü**: Kullanıcıları aktif/pasif yapma
- **İstatistikler**: Sistem geneli istatistikler

### 💊 İlaç Yönetimi
- **Barkod/Karekod Okuma**: İlaçların barkodunu okutarak otomatik bilgi çekme
- **Çoklu API Desteği**: Türkiye İlaç API'si ve OpenFDA entegrasyonu
- **Akıllı Cache Sistemi**: Hızlı erişim için ilaç bilgileri cache'leme
- **Detaylı İlaç Bilgileri**: Etken madde, üretici, saklama koşulları
- **İlaç Yönetimi**: İlaç bilgilerini ekleme, düzenleme ve silme
- **Stok Takibi**: İlaç stoklarını ve miktarlarını takip etme
- **Son Kullanım Tarihi Uyarıları**: Yaklaşan son kullanım tarihleri için otomatik uyarılar

### 📱 Teknik Özellikler
- **Responsive Tasarım**: Hem masaüstü hem mobil cihazlarda mükemmel çalışma
- **Gerçek Zamanlı API**: OpenFDA API ile gerçek ilaç bilgilerini çekme
- **Güvenli Veritabanı**: MySQL ile güvenli veri saklama
- **Modern UI/UX**: Bootstrap 5 ile profesyonel arayüz

## 🛠️ Teknolojiler

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL** - Veritabanı
- **MySQL2** - MySQL driver
- **JWT** - Authentication token
- **bcryptjs** - Şifre hash'leme
- **Axios** - HTTP client
- **Moment.js** - Tarih işlemleri

### Frontend
- **HTML5** - Yapısal markup
- **CSS3** - Styling ve responsive tasarım
- **JavaScript (ES6+)** - Modern JavaScript
- **Bootstrap 5** - UI framework
- **Font Awesome** - İkonlar
- **QuaggaJS** - Barkod/karekod okuma

## 📋 Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- MySQL Server 8.0
- Modern web tarayıcısı (Chrome, Firefox, Safari, Edge)

### Adım 1: Projeyi İndirin
```bash
git clone <repository-url>
cd home-medicine-storage
```

### Adım 2: Bağımlılıkları Yükleyin
```bash
npm install
```

### Adım 3: Veritabanını Kurun
MySQL sunucunuzun çalıştığından emin olun ve `create_database.sql` dosyasını çalıştırın:

```bash
mysql -u root -p12345 < create_database.sql
```

### Adım 4: Sunucuyu Başlatın
```bash
npm start
```

Sunucu `http://localhost:3001` adresinde çalışmaya başlayacak.

### Adım 5: Uygulamayı Açın
Web tarayıcınızda `http://localhost:3001` adresine gidin.

### Varsayılan Admin Hesabı
- **Email**: slmsrcncnr@gmail.com
- **Kullanıcı Adı**: 1fsh
- **Şifre**: 123456
- **Rol**: Admin

## 🎯 Kullanım

### Giriş/Kayıt
- Ana sayfada giriş yapın veya yeni hesap oluşturun
- Admin hesabı ile giriş yaparak admin panelini kullanabilirsiniz

### Kullanıcı Paneli
- Dashboard'da genel istatistikleri görün
- "Barkod Okut" butonu ile kamera ile barkod tarayın
- İlaçlar sekmesinden ilaç yönetimi yapın
- Stoklar sekmesinden stok takibi yapın
- Uyarılar sekmesinden son kullanım tarihi uyarılarını kontrol edin
- Profil sekmesinden kişisel bilgilerinizi güncelleyin

### Admin Paneli
- Kullanıcı yönetimi yapın
- Kullanıcı rollerini değiştirin
- Kullanıcıları aktif/pasif yapın
- Sistem istatistiklerini görün

## 📱 Mobil Kullanım

Uygulama tamamen responsive tasarıma sahiptir ve mobil cihazlarda mükemmel çalışır:

- Barkod okuma için kamera erişimi
- Dokunmatik arayüz optimizasyonu
- Mobil cihazlarda hızlı erişim

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kayıt
- `POST /api/auth/login` - Kullanıcı giriş
- `GET /api/auth/profile` - Kullanıcı profili
- `PUT /api/auth/profile` - Profil güncelle
- `PUT /api/auth/change-password` - Şifre değiştir

### Admin (Sadece Admin)
- `GET /api/auth/admin/users` - Tüm kullanıcıları listele
- `PUT /api/auth/admin/users/:id/status` - Kullanıcı durumunu değiştir
- `PUT /api/auth/admin/users/:id/role` - Kullanıcı rolünü değiştir

### İlaçlar
- `GET /api/medicines` - Tüm ilaçları listele
- `GET /api/medicines/barcode/:barcode` - Barkod ile ilaç ara
- `POST /api/medicines` - Yeni ilaç ekle
- `PUT /api/medicines/:id` - İlaç güncelle
- `DELETE /api/medicines/:id` - İlaç sil

### Stoklar
- `GET /api/stocks` - Tüm stokları listele
- `GET /api/stocks/medicine/:medicineId` - Belirli ilacın stokları
- `POST /api/stocks` - Yeni stok ekle
- `PUT /api/stocks/:id` - Stok güncelle
- `DELETE /api/stocks/:id` - Stok sil
- `GET /api/stocks/expiring/:days` - Yaklaşan son kullanım tarihleri

### Uyarılar
- `GET /api/alerts` - Tüm uyarıları listele
- `GET /api/alerts/unread` - Okunmamış uyarılar
- `PUT /api/alerts/:id/read` - Uyarıyı okundu işaretle
- `PUT /api/alerts/read-all` - Tüm uyarıları okundu işaretle
- `POST /api/alerts/check-expiry` - Son kullanım tarihi kontrolü
- `GET /api/alerts/stats` - Uyarı istatistikleri

## 🗄️ Veritabanı Yapısı

### Tablolar
- `users` - Kullanıcı bilgileri (ad, soyad, email, rol, şifre)
- `medicines` - İlaç bilgileri (kullanıcı bazlı)
- `medicine_stocks` - Stok bilgileri (kullanıcı bazlı)
- `expiry_alerts` - Son kullanım tarihi uyarıları (kullanıcı bazlı)

## 🔒 Güvenlik

- **JWT Authentication**: Güvenli token tabanlı kimlik doğrulama
- **Password Hashing**: bcrypt ile şifre hash'leme
- **CORS Koruması**: Cross-origin request koruması
- **SQL Injection Koruması**: Prepared statements kullanımı
- **Input Validation**: Giriş verilerinin doğrulanması
- **Role-based Access**: Rol bazlı erişim kontrolü
- **Error Handling**: Güvenli hata yönetimi

## 🚀 Geliştirme

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## 📝 Lisans

MIT License

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 Destek

Herhangi bir sorun yaşarsanız veya öneriniz varsa lütfen issue oluşturun.

---

**Not**: Bu uygulama eğitim amaçlıdır. Gerçek ilaç kullanımında mutlaka doktor tavsiyesi alın.
