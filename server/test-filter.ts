import { CloudAccount } from './src/models/CloudAccount';
import { getCURCostData } from './src/services/aws/curService';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const acc = await CloudAccount.findOne({ provider: 'aws' });
  const data = await getCURCostData(acc as any, '2026-02-19', '2026-02-26');
  console.log('Filtered Data Length:', data.length);
  process.exit();
}
run();
