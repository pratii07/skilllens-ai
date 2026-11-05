import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {type: String, required: true, trim: true},
  email: {type: String, required: true, unique: true, lowercase: true, trim: true},
  password: {type: String, required: true, select: false},
  role: {type: String, enum: ['mentor', 'admin', 'student'], default: 'student', index: true},
  accountStatus: {type: String, enum: ['active', 'inactive', 'suspended'], default: 'active', index: true},
  verified: {type: Boolean, default: true},
  xp: {type: Number, default: 0},
  practiceGameScore: {type: Number, default: 0},
  houseName: {type: String, default: '', trim: true},
  className: {type: String, default: '', trim: true},
  rollNumber: {type: String, default: '', trim: true},
  profilePhoto: {type: String, default: ''},
  practiceStreak: {type: Number, default: 0},
  longestStreak: {type: Number, default: 0},
  lastPracticeDate: {type: String, default: ''},
  certificates: [{name:String,earnedAt:Date,reason:String}]
},{timestamps: true});

userSchema.index({role: 1, createdAt: -1});

export default mongoose.models.User || mongoose.model('User', userSchema);
