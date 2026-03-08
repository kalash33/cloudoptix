import dotenv from 'dotenv';
import connectDB from './src/config/database';
import User from './src/models/User';
import CloudAccount from './src/models/CloudAccount';
import * as Recs from './src/routes/recommendations';

dotenv.config();

async function run() {
  await connectDB();
  const users = await User.scan().exec();
  const user = users.find(u => u.email === 'test@example.com') || users[0];
  if (!user) { console.log("No user"); process.exit(1); }
  
  const existing = await CloudAccount.query('userId').eq(user.id).exec();
  if (existing.length === 0) {
    console.log("Adding mock accounts...");
    const p1 = new CloudAccount({
        userId: user.id,
        name: 'AWS Production (Mock)',
        provider: 'aws',
        accountId: '123456789012',
        status: 'connected',
        metadata: { isMock: true, region: 'us-east-1' }
    });
    await p1.save();
  }
  
  console.log("Running gathering...");
  const costData = await Recs.gatherServiceCostData(user.id);
  console.log("Services:", costData.services.length);
  process.exit(0);
}
run();
