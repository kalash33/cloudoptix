# CloudOptix - Quick Start Guide

## 🚀 Running the Application

### Backend Server
```bash
cd server
npm install
npm run dev
```
Server runs on: **http://localhost:5001**

### Frontend
```bash
# In root directory
npm install
npm run dev
```
Frontend runs on: **http://localhost:3000**

---

## ⚙️ Environment Setup

### Backend (.env in server/)
```env
PORT=5001
MONGODB_URI=mongodb+srv://your-connection-string
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-32-byte-hex-key
CLOUDFLARE_API_TOKEN=your-cloudflare-token
```

### Frontend (.env.local in root)
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

---

## 💰 AWS Cost Data Setup (IMPORTANT!)

### Problem
AWS Cost Explorer API costs **$0.01 per request** = ~$150/month for regular use

### Solution
Use AWS Cost and Usage Reports (CUR) - **100% FREE**

### Setup Steps

1. **Deploy CloudFormation Template**
```bash
aws cloudformation create-stack \
  --stack-name finops-spendy-cur \
  --template-body file://public/aws-cur-setup.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=S3BucketName,ParameterValue=my-unique-bucket-name
```

2. **Wait for Stack Creation**
```bash
aws cloudformation wait stack-create-complete --stack-name finops-spendy-cur
```

3. **Get Credentials**
```bash
aws cloudformation describe-stacks \
  --stack-name finops-spendy-cur \
  --query 'Stacks[0].Outputs'
```

4. **Configure in CloudOptix**
- Go to Onboarding or Settings
- Add AWS account with credentials from step 3
- Set CUR bucket name in metadata

5. **Wait 24 Hours**
- First CUR report appears within 24 hours
- After that, data updates daily

### Detailed Guide
See [docs/AWS_CUR_SETUP.md](docs/AWS_CUR_SETUP.md) for complete instructions

---

## 📊 Features

- ✅ Multi-cloud cost monitoring (AWS, GCP, Azure)
- ✅ AI-powered recommendations
- ✅ Service-level cost analytics
- ✅ Budget tracking and alerts
- ✅ Kubernetes cost allocation
- ✅ Commitment management
- ✅ FREE AWS billing data via CUR

---

## 🔑 Demo Account

| Field | Value |
|-------|-------|
| Email | demo@cloudoptix.io |
| Password | Demo123456 |

---

## 📚 Documentation

- [README.md](README.md) - Full documentation
- [docs/AWS_CUR_SETUP.md](docs/AWS_CUR_SETUP.md) - CUR setup guide
- [docs/COST_EXPLORER_TO_CUR_MIGRATION.md](docs/COST_EXPLORER_TO_CUR_MIGRATION.md) - Technical details
- [docs/STATUS.md](docs/STATUS.md) - Project status
- [docs/CHANGELOG.md](docs/CHANGELOG.md) - Change history

---

## 🐛 Troubleshooting

### No Cost Data Showing

**Check 1:** Is CUR configured?
```bash
aws s3 ls s3://YOUR-BUCKET-NAME/cur-reports/ --recursive
```

**Check 2:** Has 24 hours passed since CUR setup?

**Check 3:** Is bucket name correct in CloudOptix settings?

### Backend Won't Start

**Check:** MongoDB connection string in `server/.env`
```bash
# Test connection
mongosh "your-mongodb-uri"
```

### Frontend Won't Connect

**Check:** API URL in `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

---

## 💡 Cost Savings

| Method | Monthly Cost | Annual Cost |
|--------|--------------|-------------|
| Cost Explorer API | $150 | $1,800 |
| CUR (S3 Storage) | $0.03 | $0.36 |
| **Savings** | **$149.97** | **$1,799.64** |

**99.98% cost reduction!**

---

## 🎯 Next Steps

1. ✅ Deploy CUR CloudFormation stack
2. ✅ Configure AWS credentials in CloudOptix
3. ⏳ Wait 24 hours for first CUR data
4. 📊 Start monitoring your cloud costs!
5. 🤖 Generate AI recommendations
6. 💰 Implement cost optimizations

---

## 🆘 Support

- Check server logs for `[CUR]` messages
- Review CloudFormation stack status
- Verify S3 bucket permissions
- See troubleshooting guides in docs/

---

**Remember:** CUR data has a 24-hour delay but saves you $150/month in API costs!
