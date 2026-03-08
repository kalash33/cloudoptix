import * as dynamoose from 'dynamoose';

const connectDB = async (): Promise<void> => {
  try {
    const region = process.env.AWS_REGION || 'us-east-1';

    // Create new DynamoDB instance using AWS SDK v3 underlying properties
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const ddb = new dynamoose.aws.ddb.DynamoDB({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      });
      dynamoose.aws.ddb.set(ddb);
      console.log(`✅ DynamoDB Connected in region: ${region} using explicit credentials`);
    } else {
      // Fallback to implicit default credential provider chain (e.g. AWS profile from terminal)
      const ddb = new dynamoose.aws.ddb.DynamoDB({ region });
      dynamoose.aws.ddb.set(ddb);
      console.log(`✅ DynamoDB Connected in region: ${region} using default implicit credentials`);
    }
  } catch (error) {
    console.error('❌ DynamoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
