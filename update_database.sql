-- Kullanıcı sistemi için veritabanı güncellemeleri
USE home_medicine_storage;

-- Kullanıcılar tablosunu güncelle
ALTER TABLE users MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY;
ALTER TABLE users ADD COLUMN first_name VARCHAR(100) NOT NULL AFTER id;
ALTER TABLE users ADD COLUMN last_name VARCHAR(100) NOT NULL AFTER first_name;
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user' AFTER password_hash;
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER role;
ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL AFTER is_active;
ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER last_login;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

-- İlaçlar tablosuna user_id ekle
ALTER TABLE medicines ADD COLUMN user_id INT AFTER id;
ALTER TABLE medicines ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Stoklar tablosuna user_id ekle
ALTER TABLE medicine_stocks ADD COLUMN user_id INT AFTER id;
ALTER TABLE medicine_stocks ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Uyarılar tablosuna user_id ekle
ALTER TABLE expiry_alerts ADD COLUMN user_id INT AFTER id;
ALTER TABLE expiry_alerts ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- İndeksler ekle
CREATE INDEX idx_medicines_user_id ON medicines(user_id);
CREATE INDEX idx_medicine_stocks_user_id ON medicine_stocks(user_id);
CREATE INDEX idx_expiry_alerts_user_id ON expiry_alerts(user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Admin kullanıcısı ekle (slmsrcncnr@gmail.com, şifre: 123456)
INSERT INTO users (first_name, last_name, username, email, password_hash, role, is_active) VALUES
('Admin', 'User', '1fsh', 'slmsrcncnr@gmail.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE);

-- Örnek normal kullanıcı ekle
INSERT INTO users (first_name, last_name, username, email, password_hash, role, is_active) VALUES
('Test', 'User', 'testuser', 'test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', TRUE);

-- Mevcut örnek verileri admin kullanıcısına ata
UPDATE medicines SET user_id = 1 WHERE user_id IS NULL;
UPDATE medicine_stocks SET user_id = 1 WHERE user_id IS NULL;
UPDATE expiry_alerts SET user_id = 1 WHERE user_id IS NULL;
