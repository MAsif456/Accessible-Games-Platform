/**
 * User Model - Complete Test Coverage
 * Tests schema validation, password hashing, comparePassword method, and admin seeding
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import UserModel, { IUser, seedAdminUserIfNotExists } from '../../models/user';

describe('User Model', () => {
  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test');
    }
  });

  afterEach(async () => {
    // Clean up after each test
    await UserModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
        role: 'user',
      };

      const user = new UserModel(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe('Test User');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.role).toBe('user');
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should fail without required name', async () => {
      const user = new UserModel({
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail without required email', async () => {
      const user = new UserModel({
        name: 'Test User',
        passwordHash: 'password123',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should fail without required password', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should convert email to lowercase', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'TEST@EXAMPLE.COM',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      expect(savedUser.email).toBe('test@example.com');
    });

    it('should trim whitespace from name and email', async () => {
      const user = new UserModel({
        name: '  Test User  ',
        email: '  test@example.com  ',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      expect(savedUser.name).toBe('Test User');
      expect(savedUser.email).toBe('test@example.com');
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        name: 'User One',
        email: 'duplicate@example.com',
        passwordHash: 'password123',
      };

      await new UserModel(userData).save();

      const duplicateUser = new UserModel({
        name: 'User Two',
        email: 'duplicate@example.com',
        passwordHash: 'password456',
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should default role to user', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      expect(savedUser.role).toBe('user');
    });

    it('should allow admin role', async () => {
      const user = new UserModel({
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: 'password123',
        role: 'admin',
      });

      const savedUser = await user.save();
      expect(savedUser.role).toBe('admin');
    });

    it('should allow guest role', async () => {
      const user = new UserModel({
        name: 'Guest User',
        email: 'guest@example.com',
        passwordHash: 'password123',
        role: 'guest',
      });

      const savedUser = await user.save();
      expect(savedUser.role).toBe('guest');
    });

    it('should initialize empty favourites array', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      expect(savedUser.favourites).toEqual([]);
    });

    it('should initialize empty recentlyViewed array', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      expect(savedUser.recentlyViewed).toEqual([]);
    });

    it('should set default accessibility settings', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      expect(savedUser.accessibilitySettings).toMatchObject({
        highContrast: false,
        screenReader: false,
        keyboardNavigation: true,
        voiceControl: false,
      });
    });

    it('should allow custom accessibility settings', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
        accessibilitySettings: {
          highContrast: true,
          screenReader: true,
          keyboardNavigation: true,
          voiceControl: true,
        },
      });

      const savedUser = await user.save();
      expect(savedUser.accessibilitySettings?.highContrast).toBe(true);
      expect(savedUser.accessibilitySettings?.screenReader).toBe(true);
      expect(savedUser.accessibilitySettings?.voiceControl).toBe(true);
    });

    it('should default bio to empty string', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      expect(savedUser.bio).toBe('');
    });

    it('should allow custom bio', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
        bio: 'This is my bio',
      });

      const savedUser = await user.save();
      expect(savedUser.bio).toBe('This is my bio');
    });

    it('should trim whitespace from bio', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
        bio: '  My bio  ',
      });

      const savedUser = await user.save();
      expect(savedUser.bio).toBe('My bio');
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'MyPassword123!';
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: plainPassword,
      });

      const savedUser = await user.save();

      expect(savedUser.passwordHash).not.toBe(plainPassword);
      expect(savedUser.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
      expect(savedUser.passwordHash.length).toBeGreaterThan(50);
    });

    it('should not rehash password if not modified', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      const firstHash = savedUser.passwordHash;

      // Modify a different field
      savedUser.name = 'Updated Name';
      await savedUser.save();

      expect(savedUser.passwordHash).toBe(firstHash);
    });

    it('should rehash password when modified', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      const firstHash = savedUser.passwordHash;

      // Modify password
      savedUser.passwordHash = 'newpassword456';
      await savedUser.save();

      expect(savedUser.passwordHash).not.toBe(firstHash);
      expect(savedUser.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('should use bcrypt with proper salt rounds', async () => {
      const spy = jest.spyOn(bcrypt, 'genSalt');

      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      await user.save();

      expect(spy).toHaveBeenCalledWith(10);
      spy.mockRestore();
    });
  });

  describe('comparePassword Method', () => {
    it('should return true for correct password', async () => {
      const plainPassword = 'MySecurePassword123!';
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: plainPassword,
      });

      const savedUser = await user.save();
      const isMatch = await savedUser.comparePassword(plainPassword);

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'correctpassword',
      });

      const savedUser = await user.save();
      const isMatch = await savedUser.comparePassword('wrongpassword');

      expect(isMatch).toBe(false);
    });

    it('should be case-sensitive', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'Password123',
      });

      const savedUser = await user.save();
      const isMatch = await savedUser.comparePassword('password123');

      expect(isMatch).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = 'P@ssw0rd!#$%^&*()';
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: specialPassword,
      });

      const savedUser = await user.save();
      const isMatch = await savedUser.comparePassword(specialPassword);

      expect(isMatch).toBe(true);
    });
  });

  describe('seedAdminUserIfNotExists', () => {
    it('should create admin user if none exists', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await seedAdminUserIfNotExists();

      const admin = await UserModel.findOne({ email: 'admin@playable.com' });

      expect(admin).toBeDefined();
      expect(admin?.name).toBe('Admin');
      expect(admin?.role).toBe('admin');
      expect(admin?.bio).toBe('System Administrator');
      expect(consoleSpy).toHaveBeenCalledWith('Admin user created successfully');

      consoleSpy.mockRestore();
    });

    it('should not create duplicate admin if already exists', async () => {
      // Create admin first
      await new UserModel({
        name: 'Admin',
        email: 'admin@playable.com',
        passwordHash: 'admin123',
        role: 'admin',
      }).save();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await seedAdminUserIfNotExists();

      const admins = await UserModel.find({ email: 'admin@playable.com' });
      expect(admins).toHaveLength(1);
      expect(consoleSpy).not.toHaveBeenCalledWith('Admin user created successfully');

      consoleSpy.mockRestore();
    });

    it('should upgrade existing user to admin role if needed', async () => {
      // Create regular user with admin email
      await new UserModel({
        name: 'Regular User',
        email: 'admin@playable.com',
        passwordHash: 'password123',
        role: 'user',
      }).save();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await seedAdminUserIfNotExists();

      const user = await UserModel.findOne({ email: 'admin@playable.com' });
      expect(user?.role).toBe('admin');
      expect(consoleSpy).toHaveBeenCalledWith('Updated existing user to admin role');

      consoleSpy.mockRestore();
    });

    it('should hash admin password with pre-save hook', async () => {
      await seedAdminUserIfNotExists();

      const admin = await UserModel.findOne({ email: 'admin@playable.com' });

      expect(admin?.passwordHash).not.toBe('admin123');
      expect(admin?.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('should set default accessibility settings for admin', async () => {
      await seedAdminUserIfNotExists();

      const admin = await UserModel.findOne({ email: 'admin@playable.com' });

      expect(admin?.accessibilitySettings).toMatchObject({
        highContrast: false,
        screenReader: false,
        keyboardNavigation: true,
        voiceControl: false,
      });
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();

      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
      expect(savedUser.createdAt.getTime()).toBeLessThanOrEqual(savedUser.updatedAt.getTime());
    });

    it('should update updatedAt when document is modified', async () => {
      const user = new UserModel({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'password123',
      });

      const savedUser = await user.save();
      const originalUpdatedAt = savedUser.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedUser.name = 'Updated Name';
      await savedUser.save();

      expect(savedUser.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
