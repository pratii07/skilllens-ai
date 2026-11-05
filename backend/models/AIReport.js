import mongoose from 'mongoose';

const aiReportSchema = new mongoose.Schema({
  assessmentId: {type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true},
  attemptId: {type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: true, unique: true},
  studentId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false},
  strengths: [String], weaknesses: [String], academicGaps: [mongoose.Schema.Types.Mixed],
  recommendations: [mongoose.Schema.Types.Mixed], topicWiseAnalysis: [mongoose.Schema.Types.Mixed],
  mentorFeedback: String
},{timestamps:true});
export default mongoose.models.AIReport || mongoose.model('AIReport',aiReportSchema);
