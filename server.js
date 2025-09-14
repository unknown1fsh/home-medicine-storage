const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./database');
const config = require('./config');

// Route'ları import et
const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const stockRoutes = require('./routes/stocks');
const alertRoutes = require('./routes/alerts');

const app = express();
const PORT = config.server.port;

// Middleware'ler
app.use(cors());
app.use(express.json({ charset: 'utf-8' }));
app.use(express.urlencoded({ extended: true, charset: 'utf-8' }));

// API Route'ları
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/alerts', alertRoutes);

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

// Debug sayfası route'u
app.get('/debug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'debug.html'));
});

// Test sayfası route'u
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

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
      console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
      console.log(`📊 API Endpoints:`);
      console.log(`   - GET  /api/health`);
      console.log(`   - GET  /api/medicines`);
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
