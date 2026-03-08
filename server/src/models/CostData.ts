import * as dynamoose from 'dynamoose';
import { Item } from 'dynamoose/dist/Item';
import crypto from 'crypto';

export interface ICostData extends Item {
  id: string;
  accountId: string;
  provider: 'aws' | 'gcp' | 'azure';
  date: Date;
  service: string;
  cost: number;
  currency: string;
  usageType?: string;
  region?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

const costDataSchema = new dynamoose.Schema(
  {
    id: {
      type: String,
      hashKey: true,
      default: () => crypto.randomUUID(),
    },
    accountId: {
      type: String,
      required: true,
      index: {
        name: 'accountId-date-index',
        type: 'global',
        rangeKey: 'date'
      },
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
    metadata: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

export const CostDataModel = dynamoose.model<ICostData>('CostData', costDataSchema);
export default CostDataModel;
