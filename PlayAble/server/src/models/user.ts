import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'guest' | 'user' | 'admin';
  favourites: mongoose.Types.ObjectId[];
  recentlyViewed: { gameId: mongoose.Types.ObjectId; viewedAt: Date }[];
  accessibilitySettings?: {
    highContrast?: boolean;
    screenReader?: boolean;
    keyboardNavigation?: boolean;
    voiceControl?: boolean;
  };
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['guest', 'user', 'admin'],
      default: 'user',
    },
    favourites: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Game',
      },
    ],
    recentlyViewed: [
      {
        gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
        viewedAt: { type: Date, default: Date.now },
      },
    ],
    accessibilitySettings: {
      highContrast: { type: Boolean, default: false },
      screenReader: { type: Boolean, default: false },
      keyboardNavigation: { type: Boolean, default: true },
      voiceControl: { type: Boolean, default: false },
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'users',
  },
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default UserModel;
