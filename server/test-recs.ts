import dotenv from 'dotenv';
import connectDB from './src/config/database';
import User from './src/models/User';
import * as Recs from './src/routes/recommendations';

dotenv.config();

async function test() {
  await connectDB();
  const users = await User.scan().exec();
  const user = users[0];
  if (!user) {
    console.log("No users found");
    return;
  }
  console.log("Testing for user:", user.email);
  
  const costData = await Recs.gatherServiceCostData(user.id);
  console.log("Cost data services count:", costData.services.length);
  
  if (costData.services.length > 0) {
      console.log("First service:", costData.services[0]);
  } else {
      console.log("No services! This is why it generated 0 recs.");
  }
  process.exit(0);
}
test();
