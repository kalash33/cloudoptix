import mongoose, { Document, Schema } from 'mongoose';

export interface ICostData extends Document {
  accountId: mongoose.Types.ObjectId;
  provider: 'aws' | 'gcp' | 'azure';
  date: Date;
  service: string;
  cost: number;
  currency: string;
  usageType?: string;
  region?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const costDataSchema = new Schema<ICostData>(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'CloudAccount',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['aws', 'gcp', 'azure'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    service: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    usageType: String,
    region: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
costDataSchema.index({ accountId: 1, date: -1 });
costDataSchema.index({ accountId: 1, service: 1, date: -1 });

export default mongoose.model<ICostData>('CostData', costDataSchema);
