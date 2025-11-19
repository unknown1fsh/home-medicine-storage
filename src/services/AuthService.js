/**
 * Kimlik Doğrulama Servisi
 * Kullanıcı kimlik doğrulama ve yetkilendirme işlemlerini yönetir
 */
const UserRepository = require('../repositories/UserRepository');
const UserDTO = require('../dto/UserDTO');
const CreateUserDTO = require('../dto/CreateUserDTO');
const UpdateUserDTO = require('../dto/UpdateUserDTO');
const { hashPassword, comparePassword, generateToken } = require('../middleware/auth');

class AuthService {
    constructor() {
        this.userRepository = new UserRepository();
    }

    /**
     * Kullanıcı kaydı oluşturur
     * @param {CreateUserDTO} createUserDTO - Kullanıcı oluşturma DTO'su
     * @returns {Promise<Object>} Kayıt sonucu
     */
    async register(createUserDTO) {
        try {
            // DTO validasyonu
            const validation = createUserDTO.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validasyon hatası',
                    errors: validation.errors
                };
            }

            // Şifre güvenlik kontrolü
            const passwordValidation = createUserDTO.validatePasswordSecurity();
            if (!passwordValidation.isValid) {
                return {
                    success: false,
                    message: 'Şifre güvenlik hatası',
                    errors: passwordValidation.errors
                };
            }

            // Kullanıcı adı ve email benzersizlik kontrolü
            const isUnique = await this.userRepository.isUnique(
                createUserDTO.username,
                createUserDTO.email
            );

            if (!isUnique) {
                return {
                    success: false,
                    message: 'Bu kullanıcı adı veya email zaten kayıtlı'
                };
            }

            // Şifreyi hash'le
            const passwordHash = await hashPassword(createUserDTO.password);

            // Kullanıcı entity'sini oluştur
            const userEntity = createUserDTO.toEntity();
            userEntity.passwordHash = passwordHash;

            // Kullanıcıyı kaydet
            const createdUser = await this.userRepository.create(userEntity);

            // Token oluştur
            const token = generateToken({
                id: createdUser.id,
                email: createdUser.email,
                role: createdUser.role,
                username: createdUser.username
            });

            // DTO'ya dönüştür
            const userDTO = createdUser.toDTO();

            return {
                success: true,
                message: 'Kullanıcı başarıyla kaydedildi',
                token: token,
                user: userDTO
            };

        } catch (error) {
            console.error('Kullanıcı kayıt hatası:', error);
            return {
                success: false,
                message: 'Kullanıcı kaydedilirken hata oluştu'
            };
        }
    }

    /**
     * Kullanıcı girişi yapar
     * @param {string} username - Kullanıcı adı veya email
     * @param {string} password - Şifre
     * @returns {Promise<Object>} Giriş sonucu
     */
    async login(username, password) {
        try {
            if (!username || !password) {
                return {
                    success: false,
                    message: 'Kullanıcı adı ve şifre gerekli'
                };
            }

            // Kullanıcıyı bul
            const user = await this.userRepository.findByUsernameOrEmail(username);

            if (!user) {
                return {
                    success: false,
                    message: 'Kullanıcı adı veya şifre hatalı'
                };
            }

            // Şifre kontrolü
            const isPasswordValid = await comparePassword(password, user.passwordHash);

            if (!isPasswordValid) {
                return {
                    success: false,
                    message: 'Kullanıcı adı veya şifre hatalı'
                };
            }

            // Son giriş tarihini güncelle
            await this.userRepository.updateLastLogin(user.id);

            // Token oluştur
            const token = generateToken({
                id: user.id,
                email: user.email,
                role: user.role,
                username: user.username
            });

            // DTO'ya dönüştür
            const userDTO = user.toDTO();

            return {
                success: true,
                message: 'Giriş başarılı',
                token: token,
                user: userDTO
            };

        } catch (error) {
            console.error('Kullanıcı giriş hatası:', error);
            return {
                success: false,
                message: 'Giriş yapılırken hata oluştu'
            };
        }
    }

    /**
     * Kullanıcı profilini getirir
     * @param {number} userId - Kullanıcı ID'si
     * @returns {Promise<Object>} Profil sonucu
     */
    async getProfile(userId) {
        try {
            const user = await this.userRepository.findById(userId);

            if (!user) {
                return {
                    success: false,
                    message: 'Kullanıcı bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const userDTO = user.toDTO();

            return {
                success: true,
                data: userDTO
            };

        } catch (error) {
            console.error('Profil getirme hatası:', error);
            return {
                success: false,
                message: 'Profil bilgileri getirilemedi'
            };
        }
    }

    /**
     * Kullanıcı profilini günceller
     * @param {number} userId - Kullanıcı ID'si
     * @param {UpdateUserDTO} updateUserDTO - Kullanıcı güncelleme DTO'su
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async updateProfile(userId, updateUserDTO) {
        try {
            // DTO validasyonu
            const validation = updateUserDTO.validate();
            if (!validation.isValid) {
                return {
                    success: false,
                    message: 'Validasyon hatası',
                    errors: validation.errors
                };
            }

            // Güncelleme var mı kontrol et
            if (!updateUserDTO.hasUpdates()) {
                return {
                    success: false,
                    message: 'Güncellenecek alan bulunamadı'
                };
            }

            // Email benzersizlik kontrolü
            if (updateUserDTO.email) {
                const isUnique = await this.userRepository.isUnique(
                    null,
                    updateUserDTO.email,
                    userId
                );

                if (!isUnique) {
                    return {
                        success: false,
                        message: 'Bu email adresi zaten kullanılıyor'
                    };
                }
            }

            // Veritabanı formatına dönüştür
            const updateData = updateUserDTO.toDatabaseUpdateFormat();

            // Kullanıcıyı güncelle
            const updatedUser = await this.userRepository.update(userId, updateData);

            if (!updatedUser) {
                return {
                    success: false,
                    message: 'Kullanıcı bulunamadı'
                };
            }

            // DTO'ya dönüştür
            const userDTO = updatedUser.toDTO();

            return {
                success: true,
                message: 'Profil başarıyla güncellendi',
                data: userDTO
            };

        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
            return {
                success: false,
                message: 'Profil güncellenirken hata oluştu'
            };
        }
    }

    /**
     * Kullanıcı şifresini değiştirir
     * @param {number} userId - Kullanıcı ID'si
     * @param {string} currentPassword - Mevcut şifre
     * @param {string} newPassword - Yeni şifre
     * @returns {Promise<Object>} Şifre değiştirme sonucu
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            if (!currentPassword || !newPassword) {
                return {
                    success: false,
                    message: 'Mevcut şifre ve yeni şifre gerekli'
                };
            }

            if (newPassword.length < 6) {
                return {
                    success: false,
                    message: 'Yeni şifre en az 6 karakter olmalıdır'
                };
            }

            // Kullanıcıyı getir
            const user = await this.userRepository.findById(userId);

            if (!user) {
                return {
                    success: false,
                    message: 'Kullanıcı bulunamadı'
                };
            }

            // Mevcut şifre kontrolü
            const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);

            if (!isCurrentPasswordValid) {
                return {
                    success: false,
                    message: 'Mevcut şifre hatalı'
                };
            }

            // Yeni şifreyi hash'le
            const newPasswordHash = await hashPassword(newPassword);

            // Şifreyi güncelle
            const updated = await this.userRepository.updatePassword(userId, newPasswordHash);

            if (!updated) {
                return {
                    success: false,
                    message: 'Şifre güncellenemedi'
                };
            }

            return {
                success: true,
                message: 'Şifre başarıyla değiştirildi'
            };

        } catch (error) {
            console.error('Şifre değiştirme hatası:', error);
            return {
                success: false,
                message: 'Şifre değiştirilirken hata oluştu'
            };
        }
    }

    /**
     * Tüm kullanıcıları listeler (Admin)
     * @returns {Promise<Object>} Kullanıcı listesi sonucu
     */
    async getAllUsers() {
        try {
            const users = await this.userRepository.findAll();

            // DTO'ya dönüştür
            const userDTOs = users.map(user => user.toDTO());

            return {
                success: true,
                data: userDTOs
            };

        } catch (error) {
            console.error('Kullanıcılar listeleme hatası:', error);
            return {
                success: false,
                message: 'Kullanıcılar listelenirken hata oluştu'
            };
        }
    }

    /**
     * Kullanıcı durumunu değiştirir (Admin)
     * @param {number} userId - Kullanıcı ID'si
     * @param {boolean} isActive - Aktif durumu
     * @returns {Promise<Object>} Durum değiştirme sonucu
     */
    async changeUserStatus(userId, isActive) {
        try {
            const updatedUser = await this.userRepository.update(userId, { is_active: isActive });

            if (!updatedUser) {
                return {
                    success: false,
                    message: 'Kullanıcı bulunamadı'
                };
            }

            return {
                success: true,
                message: `Kullanıcı ${isActive ? 'aktif' : 'pasif'} edildi`
            };

        } catch (error) {
            console.error('Kullanıcı durum değiştirme hatası:', error);
            return {
                success: false,
                message: 'Kullanıcı durumu değiştirilirken hata oluştu'
            };
        }
    }

    /**
     * Kullanıcı rolünü değiştirir (Admin)
     * @param {number} userId - Kullanıcı ID'si
     * @param {string} role - Yeni rol
     * @returns {Promise<Object>} Rol değiştirme sonucu
     */
    async changeUserRole(userId, role) {
        try {
            if (!['user', 'admin'].includes(role)) {
                return {
                    success: false,
                    message: 'Geçersiz rol'
                };
            }

            const updatedUser = await this.userRepository.update(userId, { role: role });

            if (!updatedUser) {
                return {
                    success: false,
                    message: 'Kullanıcı bulunamadı'
                };
            }

            return {
                success: true,
                message: `Kullanıcı rolü ${role} olarak güncellendi`
            };

        } catch (error) {
            console.error('Kullanıcı rol değiştirme hatası:', error);
            return {
                success: false,
                message: 'Kullanıcı rolü değiştirilirken hata oluştu'
            };
        }
    }

    /**
     * Kullanıcı istatistiklerini getirir
     * @returns {Promise<Object>} İstatistik sonucu
     */
    async getUserStatistics() {
        try {
            const stats = await this.userRepository.getStatistics();

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            console.error('Kullanıcı istatistikleri getirme hatası:', error);
            return {
                success: false,
                message: 'Kullanıcı istatistikleri getirilemedi'
            };
        }
    }
}

module.exports = AuthService;
