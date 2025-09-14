const express = require('express');
const router = express.Router();
const { db } = require('../database');
const moment = require('moment');
const { verifyToken } = require('../middleware/auth');

// Tüm uyarıları getir
router.get('/', verifyToken, async (req, res) => {
  try {
    const alerts = await db.query(`
      SELECT ea.*, ms.quantity, ms.expiry_date, ms.location,
             m.name as medicine_name, m.barcode, m.active_ingredient
      FROM expiry_alerts ea
      JOIN medicine_stocks ms ON ea.medicine_stock_id = ms.id
      JOIN medicines m ON ms.medicine_id = m.id
      WHERE ea.user_id = ? AND ms.user_id = ? AND m.user_id = ?
      ORDER BY ea.created_at DESC
    `, [req.user.id, req.user.id, req.user.id]);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Uyarılar getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Uyarılar getirilemedi'
    });
  }
});

// Okunmamış uyarıları getir
router.get('/unread', async (req, res) => {
  try {
    const alerts = await db.query(`
      SELECT ea.*, ms.quantity, ms.expiry_date, ms.location,
             m.name as medicine_name, m.barcode, m.active_ingredient
      FROM expiry_alerts ea
      JOIN medicine_stocks ms ON ea.medicine_stock_id = ms.id
      JOIN medicines m ON ms.medicine_id = m.id
      WHERE ea.is_read = FALSE
      ORDER BY ea.created_at DESC
    `);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Okunmamış uyarılar getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Okunmamış uyarılar getirilemedi'
    });
  }
});

// Uyarıyı okundu olarak işaretle
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'UPDATE expiry_alerts SET is_read = TRUE WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Uyarı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Uyarı okundu olarak işaretlendi'
    });
  } catch (error) {
    console.error('Uyarı okundu işaretleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Uyarı okundu olarak işaretlenirken hata oluştu'
    });
  }
});

// Tüm uyarıları okundu olarak işaretle
router.put('/read-all', async (req, res) => {
  try {
    await db.query(
      'UPDATE expiry_alerts SET is_read = TRUE WHERE is_read = FALSE'
    );
    
    res.json({
      success: true,
      message: 'Tüm uyarılar okundu olarak işaretlendi'
    });
  } catch (error) {
    console.error('Tüm uyarıları okundu işaretleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Tüm uyarılar okundu olarak işaretlenirken hata oluştu'
    });
  }
});

// Uyarı sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM expiry_alerts WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Uyarı bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Uyarı başarıyla silindi'
    });
  } catch (error) {
    console.error('Uyarı silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Uyarı silinirken hata oluştu'
    });
  }
});

// Son kullanım tarihi uyarılarını kontrol et ve oluştur
router.post('/check-expiry', async (req, res) => {
  try {
    const today = moment();
    
    // 30 gün içinde son kullanım tarihi yaklaşan stoklar
    const stocks30Days = await db.query(`
      SELECT ms.id, ms.expiry_date
      FROM medicine_stocks ms
      WHERE ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
      AND ms.id NOT IN (
        SELECT medicine_stock_id 
        FROM expiry_alerts 
        WHERE alert_type = '30_days' 
        AND DATE(created_at) = CURDATE()
      )
    `);
    
    // 15 gün içinde son kullanım tarihi yaklaşan stoklar
    const stocks15Days = await db.query(`
      SELECT ms.id, ms.expiry_date
      FROM medicine_stocks ms
      WHERE ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
      AND ms.id NOT IN (
        SELECT medicine_stock_id 
        FROM expiry_alerts 
        WHERE alert_type = '15_days' 
        AND DATE(created_at) = CURDATE()
      )
    `);
    
    // 7 gün içinde son kullanım tarihi yaklaşan stoklar
    const stocks7Days = await db.query(`
      SELECT ms.id, ms.expiry_date
      FROM medicine_stocks ms
      WHERE ms.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND ms.id NOT IN (
        SELECT medicine_stock_id 
        FROM expiry_alerts 
        WHERE alert_type = '7_days' 
        AND DATE(created_at) = CURDATE()
      )
    `);
    
    // Süresi geçmiş stoklar
    const expiredStocks = await db.query(`
      SELECT ms.id, ms.expiry_date
      FROM medicine_stocks ms
      WHERE ms.expiry_date < CURDATE()
      AND ms.id NOT IN (
        SELECT medicine_stock_id 
        FROM expiry_alerts 
        WHERE alert_type = 'expired' 
        AND DATE(created_at) = CURDATE()
      )
    `);
    
    let createdAlerts = 0;
    
    // Uyarıları oluştur
    for (const stock of stocks30Days) {
      await db.query(
        'INSERT INTO expiry_alerts (medicine_stock_id, alert_type) VALUES (?, ?)',
        [stock.id, '30_days']
      );
      createdAlerts++;
    }
    
    for (const stock of stocks15Days) {
      await db.query(
        'INSERT INTO expiry_alerts (medicine_stock_id, alert_type) VALUES (?, ?)',
        [stock.id, '15_days']
      );
      createdAlerts++;
    }
    
    for (const stock of stocks7Days) {
      await db.query(
        'INSERT INTO expiry_alerts (medicine_stock_id, alert_type) VALUES (?, ?)',
        [stock.id, '7_days']
      );
      createdAlerts++;
    }
    
    for (const stock of expiredStocks) {
      await db.query(
        'INSERT INTO expiry_alerts (medicine_stock_id, alert_type) VALUES (?, ?)',
        [stock.id, 'expired']
      );
      createdAlerts++;
    }
    
    res.json({
      success: true,
      message: `${createdAlerts} yeni uyarı oluşturuldu`,
      details: {
        '30_days': stocks30Days.length,
        '15_days': stocks15Days.length,
        '7_days': stocks7Days.length,
        'expired': expiredStocks.length
      }
    });
  } catch (error) {
    console.error('Son kullanım tarihi kontrol hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Son kullanım tarihi kontrol edilirken hata oluştu'
    });
  }
});

// Uyarı istatistikleri
router.get('/stats', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        alert_type,
        COUNT(*) as count,
        SUM(CASE WHEN is_read = FALSE THEN 1 ELSE 0 END) as unread_count
      FROM expiry_alerts
      GROUP BY alert_type
    `);
    
    const totalAlerts = await db.query(`
      SELECT COUNT(*) as total FROM expiry_alerts
    `);
    
    const unreadAlerts = await db.query(`
      SELECT COUNT(*) as unread FROM expiry_alerts WHERE is_read = FALSE
    `);
    
    res.json({
      success: true,
      data: {
        total: totalAlerts[0].total,
        unread: unreadAlerts[0].unread,
        by_type: stats
      }
    });
  } catch (error) {
    console.error('Uyarı istatistikleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Uyarı istatistikleri getirilemedi'
    });
  }
});

module.exports = router;
