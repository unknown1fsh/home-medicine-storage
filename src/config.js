// Veritabanı ve uygulama konfigürasyonu
// Railway deployment için environment variables kullanılır
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '12345',
    database: process.env.DB_NAME || 'home_medicine_storage',
    port: parseInt(process.env.DB_PORT) || 3306
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expiresIn: '24h'
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development'
  }
};

module.exports = config;
