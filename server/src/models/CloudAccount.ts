import mongoose, { Document, Schema } from 'mongoose';

export type CloudProvider = 'aws' | 'gcp' | 'azure';
export type AccountStatus = 'pending' | 'connected' | 'error' | 'syncing';

export interface ICloudAccount extends Document {
  userId: mongoose.Types.ObjectId;
  provider: CloudProvider;
  name: string;
  accountId: string; // AWS Account ID, GCP Project ID, or Azure Subscription ID
  encryptedCredentials: string; // AES-256 encrypted credentials
  status: AccountStatus;
  lastSyncAt?: Date;
  lastSyncError?: string;
  metadata?: {
    region?: string;
    bigQueryDataset?: string; // For GCP
    tenantId?: string; // For Azure
  };
  createdAt: Date;
  updatedAt: Date;
}

const cloudAccountSchema = new Schema<ICloudAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['aws', 'gcp', 'azure'],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    encryptedCredentials: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'connected', 'error', 'syncing'],
      default: 'pending',
    },
    lastSyncAt: {
      type: Date,
    },
    lastSyncError: {
      type: String,
    },
    metadata: {
      region: String,
      bigQueryDataset: String,
      tenantId: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user + provider queries
cloudAccountSchema.index({ userId: 1, provider: 1 });

export default mongoose.model<ICloudAccount>('CloudAccount', cloudAccountSchema);
