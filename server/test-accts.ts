import dotenv from 'dotenv';
import connectDB from './src/config/database';
import User from './src/models/User';
import CloudAccount from './src/models/CloudAccount';

dotenv.config();
async function test() {
  await connectDB();
  const users = await User.scan().exec();
  const user = users[0];
  console.log("Testing for user:", user.email, user.id);
  const accounts = await CloudAccount.query('userId').eq(user.id).exec();
  console.log("Accounts:", accounts);
  process.exit(0);
}
test();
