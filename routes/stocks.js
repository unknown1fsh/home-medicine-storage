const express = require('express');
const router = express.Router();
const { db } = require('../database');
const moment = require('moment');
const { verifyToken } = require('../middleware/auth');

// Tüm stokları getir
router.get('/', verifyToken, async (req, res) => {
  try {
    const stocks = await db.query(`
      SELECT ms.*, m.name as medicine_name, m.barcode, m.active_ingredient, m.manufacturer
      FROM medicine_stocks ms
      JOIN medicines m ON ms.medicine_id = m.id
      WHERE ms.user_id = ? AND m.user_id = ?
      ORDER BY ms.expiry_date ASC
    `, [req.user.id, req.user.id]);
    
    // Son kullanım tarihi kontrolü
    const stocksWithStatus = stocks.map(stock => {
      const expiryDate = moment(stock.expiry_date);
      const today = moment();
      const daysUntilExpiry = expiryDate.diff(today, 'days');
      
      let status = 'good';
      if (daysUntilExpiry < 0) {
        status = 'expired';
      } else if (daysUntilExpiry <= 7) {
        status = 'critical';
      } else if (daysUntilExpiry <= 30) {
        status = 'warning';
      }
      
      return {
        ...stock,
        days_until_expiry: daysUntilExpiry,
        status: status
      };
    });
    
    res.json({
      success: true,
      data: stocksWithStatus
    });
  } catch (error) {
    console.error('Stoklar getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Stoklar getirilemedi'
    });
  }
});

// Belirli bir ilacın stoklarını getir
router.get('/medicine/:medicineId', async (req, res) => {
  try {
    const { medicineId } = req.params;
    
    const stocks = await db.query(`
      SELECT ms.*, m.name as medicine_name, m.barcode
      FROM medicine_stocks ms
      JOIN medicines m ON ms.medicine_id = m.id
      WHERE ms.medicine_id = ?
      ORDER BY ms.expiry_date ASC
    `, [medicineId]);
    
    res.json({
      success: true,
      data: stocks
    });
  } catch (error) {
    console.error('İlaç stokları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlaç stokları getirilemedi'
    });
  }
});

// Yeni stok ekle
router.post('/', async (req, res) => {
  try {
    const {
      medicine_id,
      quantity,
      purchase_date,
      expiry_date,
      purchase_price,
      location,
      notes
    } = req.body;
    
    // Gerekli alanları kontrol et
    if (!medicine_id || !quantity || !expiry_date) {
      return res.status(400).json({
        success: false,
        message: 'İlaç ID, miktar ve son kullanım tarihi zorunludur'
      });
    }
    
    // İlaç var mı kontrol et
    const medicine = await db.query(
      'SELECT id FROM medicines WHERE id = ?',
      [medicine_id]
    );
    
    if (medicine.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlaç bulunamadı'
      });
    }
    
    const result = await db.query(`
      INSERT INTO medicine_stocks (medicine_id, quantity, purchase_date, expiry_date, purchase_price, location, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [medicine_id, quantity, purchase_date, expiry_date, purchase_price, location, notes]);
    
    const newStock = await db.query(`
      SELECT ms.*, m.name as medicine_name, m.barcode
      FROM medicine_stocks ms
      JOIN medicines m ON ms.medicine_id = m.id
      WHERE ms.id = ?
    `, [result.insertId]);
    
    res.status(201).json({
      success: true,
      data: newStock[0],
      message: 'Stok başarıyla eklendi'
    });
  } catch (error) {
    console.error('Stok ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Stok eklenirken hata oluştu'
    });
  }
});

// Stok güncelle
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Güncellenecek alanları hazırla
    const allowedFields = [
      'quantity', 'purchase_date', 'expiry_date', 
      'purchase_price', 'location', 'notes'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updateData[field]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek alan bulunamadı'
      });
    }
    
    updateValues.push(id);
    
    await db.query(`
      UPDATE medicine_stocks 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
    
    const updatedStock = await db.query(`
      SELECT ms.*, m.name as medicine_name, m.barcode
      FROM medicine_stocks ms
      JOIN medicines m ON ms.medicine_id = m.id
      WHERE ms.id = ?
    `, [id]);
    
    if (updatedStock.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stok bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: updatedStock[0],
      message: 'Stok başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Stok güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Stok güncellenirken hata oluştu'
    });
  }
});

// Stok sil
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM medicine_stocks WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stok bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'Stok başarıyla silindi'
    });
  } catch (error) {
    console.error('Stok silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Stok silinirken hata oluştu'
    });
  }
});

// Yaklaşan son kullanım tarihleri
router.get('/expiring/:days', async (req, res) => {
  try {
    const { days } = req.params;
    const daysInt = parseInt(days);
    
    if (isNaN(daysInt) || daysInt < 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir gün sayısı giriniz'
      });
    }
    
    const stocks = await db.query(`
      SELECT ms.*, m.name as medicine_name, m.barcode, m.active_ingredient
      FROM medicine_stocks ms
      JOIN medicines m ON ms.medicine_id = m.id
      WHERE ms.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY ms.expiry_date ASC
    `, [daysInt]);
    
    res.json({
      success: true,
      data: stocks,
      message: `${days} gün içinde son kullanım tarihi yaklaşan ${stocks.length} stok bulundu`
    });
  } catch (error) {
    console.error('Yaklaşan son kullanım tarihleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Yaklaşan son kullanım tarihleri getirilemedi'
    });
  }
});

module.exports = router;
