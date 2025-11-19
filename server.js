const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./src/config/database');
const config = require('./src/config');

// Controller'ları import et
const authController = require('./src/controllers/AuthController');
const medicineController = require('./src/controllers/MedicineController');
const stockController = require('./src/controllers/StockController');
const alertController = require('./src/controllers/AlertController');

const app = express();
const PORT = config.server.port;

// Middleware'ler
app.use(cors());
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// API Route'ları
app.use('/api/auth', authController);
app.use('/api/medicines', medicineController);
app.use('/api/stocks', stockController);
app.use('/api/alerts', alertController);

// Ana sayfa route'u
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard route'u
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login sayfası route'u
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Debug ve Test sayfaları kaldırıldı

// Static dosyalar için (route'lardan sonra)
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    res.json({
      status: 'OK',
      database: dbStatus ? 'Connected' : 'Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint bulunamadı',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: config.server.env === 'development' ? error.message : 'Bir hata oluştu'
  });
});

// Sunucuyu başlat
const startServer = async () => {
  try {
    // Veritabanı bağlantısını test et
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 Sunucu ${PORT} portunda çalışıyor`);
      console.log(`🌐 URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'http://localhost:' + PORT}`);
      console.log(`📊 API Endpoints:`);
      console.log(`   - POST /api/auth/login`);
      console.log(`   - GET  /api/medicines`);
      console.log(`   - GET  /api/medicines/barcode/:barcode`);
      console.log(`   - POST /api/medicines`);
      console.log(`   - GET  /api/stocks`);
      console.log(`   - POST /api/stocks`);
      console.log(`   - GET  /api/alerts`);
    });
  } catch (error) {
    console.error('❌ Sunucu başlatılamadı:', error.message);
    process.exit(1);
  }
};

startServer();
