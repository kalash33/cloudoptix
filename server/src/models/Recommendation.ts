import mongoose, { Document, Schema } from 'mongoose';

export type RecommendationType = 'rightsizing' | 'unused' | 'commitment' | 'service-switch' | 'migration';
export type EffortLevel = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RecommendationStatus = 'active' | 'dismissed' | 'applied';

export interface IRecommendation extends Document {
  accountId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: RecommendationType;
  title: string;
  description: string;
  resourceId: string;
  resourceName: string;
  service: string;
  provider: 'aws' | 'gcp' | 'azure';
  currentCost: number;
  projectedCost: number;
  savings: number;
  savingsPercent: number;
  effort: EffortLevel;
  risk: RiskLevel;
  status: RecommendationStatus;
  implementationSteps?: string[];
  detectedAt: Date;
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'CloudAccount',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['rightsizing', 'unused', 'commitment', 'service-switch', 'migration'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      required: true,
    },
    resourceName: {
      type: String,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ['aws', 'gcp', 'azure'],
      required: true,
    },
    currentCost: {
      type: Number,
      required: true,
    },
    projectedCost: {
      type: Number,
      required: true,
    },
    savings: {
      type: Number,
      required: true,
    },
    savingsPercent: {
      type: Number,
      required: true,
    },
    effort: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    risk: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'dismissed', 'applied'],
      default: 'active',
    },
    implementationSteps: [String],
    detectedAt: {
      type: Date,
      default: Date.now,
    },
    appliedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
recommendationSchema.index({ userId: 1, status: 1 });
recommendationSchema.index({ userId: 1, type: 1 });

export default mongoose.model<IRecommendation>('Recommendation', recommendationSchema);
