import mongoose from 'mongoose';

const reviewItemSchema = new mongoose.Schema({
  index: Number,
  text: String,
  type: { type: String },
  correctAnswer: mongoose.Schema.Types.Mixed,
  options: [mongoose.Schema.Types.Mixed],
  correct: Boolean,
  explanation: String
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  studentName: { type: String, required: true, trim: true },
  studentEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'AssessmentAttempt', required: false },
  status: { type: String, enum: ['Submitted', 'Evaluated'], default: 'Submitted' },
  result: {
    score: Number,
    totalPossible: Number,
    passed: Boolean,
    needsReview: Boolean,
    status: String,
    summary: String,
    strengths: [String],
    gaps: [String],
    nextSteps: [String],
    improvements: [String],
    mentorFeedback: String,
    correctCount: Number,
    wrongCount: Number,
    correctQuestions: [String],
    wrongQuestions: [String],
    questionReview: [reviewItemSchema]
  }
}, { timestamps: true });

submissionSchema.index({ assessment: 1, studentEmail: 1 });

export default mongoose.models.Submission || mongoose.model('Submission', submissionSchema);
