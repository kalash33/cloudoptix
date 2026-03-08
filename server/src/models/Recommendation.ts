import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import crypto from 'crypto';

export type RecommendationType = 'rightsizing' | 'unused' | 'commitment' | 'service-switch' | 'migration';
export type EffortLevel = 'low' | 'medium' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high';
export type RecommendationStatus = 'active' | 'dismissed' | 'applied';

export interface IRecommendation extends Item {
  id: string;
  accountId: string;
  userId: string;
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
  detectedAt?: Date;
  appliedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const recommendationSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => crypto.randomUUID(),
    },
    accountId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      index: [
        {
          name: 'userId-status-index',
          type: 'global',
          rangeKey: 'status',
        },
        {
          name: 'userId-type-index',
          type: 'global',
          rangeKey: 'type',
        }
      ]
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
    implementationSteps: {
      type: Array,
      schema: [String],
    },
    detectedAt: {
      type: Date,
      default: () => new Date(),
    },
    appliedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const RecommendationModel = dynamoose.model<IRecommendation>('Recommendation', recommendationSchema);
export default RecommendationModel;
