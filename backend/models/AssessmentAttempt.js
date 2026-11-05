import mongoose from 'mongoose';

const assessmentAttemptSchema = new mongoose.Schema({
  assessmentId: {type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: false, index: true},
  assessmentToken: {type: String, required: true, index: true},
  studentId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false},
  studentName: {type: String, required: true, trim: true},
  studentEmail: {type: String, required: true, lowercase: true, trim: true, index: true},
  startTime: {type: Date, required: true},
  endTime: Date,
  remainingTime: Number,
  score: {type: Number, default: 0},
  status: {type: String, enum: ['In Progress','Submitted','Evaluated'], default: 'In Progress', index: true}
},{timestamps:true});

assessmentAttemptSchema.index({assessmentToken:1,studentEmail:1});
export default mongoose.models.AssessmentAttempt || mongoose.model('AssessmentAttempt',assessmentAttemptSchema);
