const express = require('express');
const router = express.Router();
const { db } = require('../database');
const axios = require('axios');
const config = require('../config');
const { verifyToken } = require('../middleware/auth');
const MedicineAPIService = require('../services/medicineAPI');

// İlaç API servisi instance'ı
const medicineAPI = new MedicineAPIService();

// Tüm ilaçları getir
router.get('/', verifyToken, async (req, res) => {
  try {
    const medicines = await db.query(`
      SELECT m.*, 
             COUNT(ms.id) as stock_count,
             MIN(ms.expiry_date) as nearest_expiry
      FROM medicines m
      LEFT JOIN medicine_stocks ms ON m.id = ms.medicine_id AND ms.user_id = ?
      WHERE m.user_id = ?
      GROUP BY m.id
      ORDER BY m.name
    `, [req.user.id, req.user.id]);
    
    res.json({
      success: true,
      data: medicines
    });
  } catch (error) {
    console.error('İlaçlar getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlaçlar getirilemedi'
    });
  }
});

// Barkod ile ilaç ara
router.get('/barcode/:barcode', verifyToken, async (req, res) => {
  try {
    const { barcode } = req.params;
    
    // Önce veritabanında ara (kullanıcının ilaçları arasında)
    const existingMedicine = await db.query(
      'SELECT * FROM medicines WHERE barcode = ? AND user_id = ?',
      [barcode, req.user.id]
    );
    
    if (existingMedicine.length > 0) {
      return res.json({
        success: true,
        data: existingMedicine[0],
        source: 'database'
      });
    }
    
    // Veritabanında yoksa API'den çek
    try {
      console.log('Veritabanında bulunamadı, API\'den çekiliyor:', barcode);
      
      // Yeni MedicineAPI servisini kullan
      const apiResult = await medicineAPI.searchMedicineByBarcode(barcode);
      
      if (apiResult.success) {
        const medicineData = apiResult.data;
        
        // API'den gelen veriyi veritabanına kaydet
        const insertResult = await db.query(`
          INSERT INTO medicines (barcode, name, active_ingredient, manufacturer, dosage_form, strength, package_size, description, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          barcode,
          medicineData.name,
          medicineData.active_ingredient,
          medicineData.manufacturer,
          medicineData.dosage_form,
          medicineData.strength,
          medicineData.package_size,
          medicineData.description,
          req.user.id
        ]);
        
        const newMedicine = await db.query(
          'SELECT * FROM medicines WHERE id = ?',
          [insertResult.insertId]
        );
        
        return res.json({
          success: true,
          data: newMedicine[0],
          source: apiResult.source,
          api_info: {
            country: medicineData.country,
            prescription_required: medicineData.prescription_required,
            storage_conditions: medicineData.storage_conditions || null
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: apiResult.message || 'Barkod ile ilaç bulunamadı'
        });
      }
    } catch (apiError) {
      console.error('API hatası:', apiError.message);
      return res.status(404).json({
        success: false,
        message: 'Barkod ile ilaç bulunamadı ve API erişilemedi'
      });
    }
  } catch (error) {
    console.error('Barkod arama hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Barkod arama sırasında hata oluştu'
    });
  }
});

// Detaylı ilaç bilgisi getir
router.get('/detailed/:barcode', verifyToken, async (req, res) => {
  try {
    const { barcode } = req.params;
    
    console.log('Detaylı ilaç bilgisi isteniyor:', barcode);
    
    const detailedInfo = await medicineAPI.getDetailedMedicineInfo(barcode);
    
    if (detailedInfo.success) {
      res.json({
        success: true,
        data: detailedInfo.data,
        source: detailedInfo.source,
        additional_info: detailedInfo.additional_info
      });
    } else {
      res.status(404).json({
        success: false,
        message: detailedInfo.message || 'Detaylı ilaç bilgisi bulunamadı'
      });
    }
    
  } catch (error) {
    console.error('Detaylı ilaç bilgisi hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Detaylı ilaç bilgisi alınırken hata oluştu'
    });
  }
});

// İlaç API cache temizle
router.post('/clear-cache', verifyToken, async (req, res) => {
  try {
    medicineAPI.clearCache();
    res.json({
      success: true,
      message: 'İlaç API cache temizlendi'
    });
  } catch (error) {
    console.error('Cache temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Cache temizlenirken hata oluştu'
    });
  }
});

// Yeni ilaç ekle
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      barcode,
      name,
      active_ingredient,
      manufacturer,
      dosage_form,
      strength,
      package_size,
      description
    } = req.body;
    
    // Gerekli alanları kontrol et
    if (!barcode || !name) {
      return res.status(400).json({
        success: false,
        message: 'Barkod ve ilaç adı zorunludur'
      });
    }
    
    // Barkod benzersizlik kontrolü (kullanıcı bazlı)
    const existingMedicine = await db.query(
      'SELECT id FROM medicines WHERE barcode = ? AND user_id = ?',
      [barcode, req.user.id]
    );
    
    if (existingMedicine.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu barkod zaten kayıtlı'
      });
    }
    
    const result = await db.query(`
      INSERT INTO medicines (barcode, name, active_ingredient, manufacturer, dosage_form, strength, package_size, description, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [barcode, name, active_ingredient, manufacturer, dosage_form, strength, package_size, description, req.user.id]);
    
    const newMedicine = await db.query(
      'SELECT * FROM medicines WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      data: newMedicine[0],
      message: 'İlaç başarıyla eklendi'
    });
  } catch (error) {
    console.error('İlaç ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlaç eklenirken hata oluştu'
    });
  }
});

// İlaç güncelle
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Güncellenecek alanları hazırla
    const allowedFields = [
      'name', 'active_ingredient', 'manufacturer', 
      'dosage_form', 'strength', 'package_size', 'description'
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
      UPDATE medicines 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `, [...updateValues, req.user.id]);
    
    const updatedMedicine = await db.query(
      'SELECT * FROM medicines WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (updatedMedicine.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlaç bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: updatedMedicine[0],
      message: 'İlaç başarıyla güncellendi'
    });
  } catch (error) {
    console.error('İlaç güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlaç güncellenirken hata oluştu'
    });
  }
});

// İlaç sil
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // İlaçın stokları var mı kontrol et (kullanıcı bazlı)
    const stocks = await db.query(
      'SELECT COUNT(*) as count FROM medicine_stocks WHERE medicine_id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (stocks[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu ilacın stokları mevcut. Önce stokları silin.'
      });
    }
    
    const result = await db.query(
      'DELETE FROM medicines WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'İlaç bulunamadı'
      });
    }
    
    res.json({
      success: true,
      message: 'İlaç başarıyla silindi'
    });
  } catch (error) {
    console.error('İlaç silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İlaç silinirken hata oluştu'
    });
  }
});

module.exports = router;
