import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    profilePicUrl: {
      type: String,
      default: '',
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['admin', 'owner', 'staff', 'super_admin', 'SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'],
      default: 'owner',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    currentRefreshToken: {
      type: String,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    if (!candidatePassword || typeof candidatePassword !== 'string' || !this.passwordHash || typeof this.passwordHash !== 'string') {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (_err) {
    return false;
  }
};

export const User = mongoose.model('User', userSchema);
