// Veritabanı ve uygulama konfigürasyonu
const config = {
  database: {
    host: 'localhost',
    user: 'root',
    password: '12345',
    database: 'home_medicine_storage',
    port: 3306
  },
  jwt: {
    secret: 'your_jwt_secret_key_here',
    expiresIn: '24h'
  },
  server: {
    port: 3000,
    env: 'development'
  },
  openfda: {
    apiKey: 'your_openfda_api_key_here',
    baseUrl: 'https://api.fda.gov/drug/ndc.json'
  }
};

module.exports = config;
