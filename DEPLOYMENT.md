# Evdeki İlaç Depom - Vercel Deployment

## 🚀 Vercel'e Deploy Etme

### 1. Vercel CLI Kurulumu
```bash
npm install -g vercel
```

### 2. Proje Deploy Etme
```bash
vercel
```

### 3. Environment Variables Ayarlama
Vercel dashboard'da şu environment variable'ları ekleyin:

```
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=home_medicine_storage
DB_PORT=3306
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
```

### 4. MySQL Veritabanı
- PlanetScale, Railway, veya başka bir MySQL hosting kullanın
- Veritabanı şemasını oluşturun
- Admin kullanıcısını ekleyin

## 📱 Mobil Özellikler

### Barkod Okuma
- ✅ Kamera erişimi
- ✅ Gerçek zamanlı tarama
- ✅ Çoklu format desteği
- ✅ Responsive tasarım

### HTTPS Gereksinimi
- Vercel otomatik HTTPS sağlar
- Kamera erişimi için HTTPS zorunlu
- Güvenli bağlantı garantisi

## 🔧 Mobil Optimizasyonlar

### Kamera Ayarları
```javascript
// Mobil cihazlar için optimize edilmiş kamera ayarları
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment', // Arka kamera
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
});
```

### Responsive Tasarım
- Bootstrap 5 ile mobil uyumlu
- Dokunmatik arayüz optimizasyonu
- Mobil cihazlarda hızlı erişim

## 🌐 Production URL
Deploy sonrası: `https://your-app-name.vercel.app`

## 📋 Checklist
- [ ] Vercel hesabı oluştur
- [ ] MySQL veritabanı hazırla
- [ ] Environment variables ayarla
- [ ] Deploy et
- [ ] Mobil cihazda test et
- [ ] Kamera izinlerini kontrol et
