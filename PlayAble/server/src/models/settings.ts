import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  voiceInput: boolean;
  captions: boolean;
  microphoneActive: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  darkMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    voiceInput: {
      type: Boolean,
      default: true,
    },
    captions: {
      type: Boolean,
      default: true,
    },
    microphoneActive: {
      type: Boolean,
      default: true,
    },
    highContrastMode: {
      type: Boolean,
      default: false,
    },
    reducedMotion: {
      type: Boolean,
      default: false,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'user_settings',
  }
);

const UserSettingsModel =
  mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);

export default UserSettingsModel;

