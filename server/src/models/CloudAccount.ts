import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import crypto from 'crypto';

export type CloudProvider = 'aws' | 'gcp' | 'azure';
export type AccountStatus = 'pending' | 'connected' | 'error' | 'syncing';

export interface ICloudAccount extends Item {
  id: string; // Native UUID 
  userId: string; // Linked User UUID
  provider: CloudProvider;
  name: string;
  accountId: string;
  encryptedCredentials?: string;
  authType: 'keys' | 'role';
  roleArn?: string;
  externalId?: string;
  status: AccountStatus;
  lastSyncAt?: Date;
  lastSyncError?: string;
  metadata?: {
    region?: string;
    bigQueryDataset?: string;
    tenantId?: string;
    curBucketName?: string;
    curReportPath?: string;
    curRegion?: string;
    isMock?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const cloudAccountSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => crypto.randomUUID(),
    },
    userId: {
      type: String,
      required: true,
      index: {
        name: 'userId-provider-index',
        type: 'global',
        rangeKey: 'provider'
      },
    },
    provider: {
      type: String,
      enum: ['aws', 'gcp', 'azure'],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    accountId: {
      type: String,
      required: true,
    },
    encryptedCredentials: {
      type: String,
      required: false,
    },
    authType: {
      type: String,
      enum: ['keys', 'role'],
      default: 'keys',
    },
    roleArn: {
      type: String,
    },
    externalId: {
      type: String,
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
      type: Object,
      schema: {
        region: String,
        bigQueryDataset: String,
        tenantId: String,
        curBucketName: String,
        curReportPath: String,
        curRegion: String,
        isMock: Boolean,
      }
    },
  },
  {
    timestamps: true,
  }
);

export const CloudAccountModel = dynamoose.model<ICloudAccount>('CloudAccount', cloudAccountSchema);
export default CloudAccountModel;
