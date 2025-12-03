import bcrypt from 'bcryptjs';
import UserModel, { seedAdminUserIfNotExists } from '../../models/user';

describe('user model hooks and helpers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const getPreSaveHook = () => {
    const pres = (UserModel as any).schema?.s?.hooks?._pres?.get('save') || [];
    // Grab the custom bcrypt pre-save hook (skip mongoose internal validators)
    const hookEntry = pres.find((p: any) => typeof p?.fn === 'function' && p.fn.toString().includes('bcrypt'));
    return hookEntry?.fn;
  };

  it('hashes password on pre-save when modified', async () => {
    const hook = getPreSaveHook();
    expect(typeof hook).toBe('function');

    const doc: any = {
      passwordHash: 'plain-text',
      isModified: jest.fn().mockReturnValue(true),
    };
    const next = jest.fn();

    // Mimic async versions of bcrypt helpers used in the hook
    const genSaltSpy = jest
      .spyOn(bcrypt as any, 'genSalt')
      .mockImplementation(async () => 'salt');
    const hashSpy = jest
      .spyOn(bcrypt as any, 'hash')
      .mockImplementation(async () => 'hashed-value');

    // Call the hook with a minimal mongoose-like context to bypass built-in validation
    const context: any = {
      ...doc,
      $__: { options: { validateBeforeSave: false } },
    };

    await hook!.call(context, next);

    expect(doc.isModified).toHaveBeenCalledWith('passwordHash');
    expect(genSaltSpy).toHaveBeenCalledWith(10);
    expect(hashSpy).toHaveBeenCalledWith('plain-text', 'salt');
    expect(context.passwordHash).toBe('hashed-value');
    expect(next).toHaveBeenCalled();
  });

  it('skips hashing when password not modified', async () => {
    const hook = getPreSaveHook();
    const doc: any = {
      passwordHash: 'already-hashed',
      isModified: jest.fn().mockReturnValue(false),
    };
    const next = jest.fn();

    const hashSpy = jest.spyOn(bcrypt as any, 'hash');

    const context: any = {
      ...doc,
      $__: { options: { validateBeforeSave: false } },
    };

    await hook!.call(context, next);

    expect(hashSpy).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('compares password using bcrypt', async () => {
    const userDoc = new UserModel({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'stored-hash',
    });

    const compareSpy = jest
      .spyOn(bcrypt as any, 'compare')
      .mockImplementation(async () => true);

    const result = await userDoc.comparePassword('candidate');

    expect(compareSpy).toHaveBeenCalledWith('candidate', 'stored-hash');
    expect(result).toBe(true);
  });

  describe('seedAdminUserIfNotExists', () => {
    it('updates existing admin user role when needed', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const existing = { role: 'user', save } as any;
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(existing);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await seedAdminUserIfNotExists();

      expect(existing.role).toBe('admin');
      expect(save).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('returns early when admin already exists', async () => {
      const save = jest.fn();
      jest.spyOn(UserModel, 'findOne').mockResolvedValue({ role: 'admin', save } as any);

      await seedAdminUserIfNotExists();

      expect(save).not.toHaveBeenCalled();
    });

    it('creates admin user when missing', async () => {
      jest.spyOn(UserModel, 'findOne').mockResolvedValue(null);
      const saveSpy = jest
        .spyOn(UserModel.prototype, 'save')
        .mockImplementation(async function (this: any) {
          return this;
        });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await seedAdminUserIfNotExists();

      expect(saveSpy).toHaveBeenCalled();
      const createdInstance = saveSpy.mock.instances[0] as any;
      expect(createdInstance.email).toBe('admin@playable.com');
      expect(createdInstance.role).toBe('admin');
      expect(createdInstance.passwordHash).toBe('admin123');

      logSpy.mockRestore();
    });
  });
});
