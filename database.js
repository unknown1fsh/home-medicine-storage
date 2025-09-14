const mysql = require('mysql2/promise');
const config = require('./config');

// Veritabanı bağlantı havuzu oluştur
const pool = mysql.createPool({
  host: config.database.host,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  port: config.database.port,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Bağlantıyı test et
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Veritabanı bağlantısı başarılı');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Veritabanı bağlantı hatası:', error.message);
    return false;
  }
};

// Veritabanı sorguları için yardımcı fonksiyonlar
const db = {
  // Tekil sorgu çalıştır
  query: async (sql, params = []) => {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('Veritabanı sorgu hatası:', error);
      throw error;
    }
  },

  // Transaction başlat
  beginTransaction: async () => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
  },

  // Transaction commit
  commit: async (connection) => {
    await connection.commit();
    connection.release();
  },

  // Transaction rollback
  rollback: async (connection) => {
    await connection.rollback();
    connection.release();
  },

  // Bağlantı havuzunu kapat
  close: async () => {
    await pool.end();
  }
};

module.exports = { db, testConnection };
