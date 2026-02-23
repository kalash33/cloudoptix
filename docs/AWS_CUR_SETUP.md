# AWS Cost and Usage Reports (CUR) Setup Guide

## Why Use CUR Instead of Cost Explorer API?

| Feature | Cost Explorer API | CUR (Cost and Usage Reports) |
|---------|-------------------|------------------------------|
| **Cost** | $0.01 per request | **100% FREE** |
| **Data Detail** | Aggregated | Line-item detail |
| **Latency** | Real-time | 24-hour delay |
| **Storage** | N/A | S3 storage costs (~$0.023/GB) |
| **Best For** | Ad-hoc queries | Regular monitoring |

**Bottom Line:** For a FinOps platform that queries costs frequently, CUR saves hundreds of dollars per month.

---

## Prerequisites

- AWS Account with billing access
- AWS CLI installed and configured
- CloudFormation permissions

---

## Step 1: Deploy CloudFormation Stack

The CloudFormation template creates:
- S3 bucket for CUR storage
- CUR report configuration
- IAM user with read-only S3 access
- Lifecycle policy (keeps 90 days of data)

### Deploy via AWS CLI

```bash
# Navigate to project root
cd /path/to/finopsspendy

# Deploy the stack
aws cloudformation create-stack \
  --stack-name finops-spendy-cur \
  --template-body file://public/aws-cur-setup.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=S3BucketName,ParameterValue=my-unique-bucket-name

# Wait for completion (takes ~2 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name finops-spendy-cur

# Get the outputs
aws cloudformation describe-stacks \
  --stack-name finops-spendy-cur \
  --query 'Stacks[0].Outputs'
```

### Deploy via AWS Console

1. Go to **CloudFormation** in AWS Console
2. Click **Create Stack** → **With new resources**
3. Upload `public/aws-cur-setup.yaml`
4. Enter a unique S3 bucket name
5. Check "I acknowledge that AWS CloudFormation might create IAM resources"
6. Click **Create Stack**
7. Wait for `CREATE_COMPLETE` status
8. Go to **Outputs** tab and note the values

---

## Step 2: Save Credentials

From the CloudFormation outputs, you'll get:

```
AccessKeyId: AKIA...
SecretAccessKey: wJalr...
S3BucketName: finops-spendy-cur-bucket-123456789012
ReportPath: s3://finops-spendy-cur-bucket-123456789012/cur-reports/finops-spendy-cur/
```

**IMPORTANT:** Save these credentials securely. You'll need them to configure CloudOptix.

---

## Step 3: Configure CloudOptix

### Option A: During Onboarding

1. Go to **Onboarding** page in CloudOptix
2. Select **AWS**
3. Choose **Access Keys** authentication
4. Enter the credentials from Step 2
5. In **Advanced Settings**, add:
   - **CUR Bucket Name:** `finops-spendy-cur-bucket-123456789012`
   - **CUR Report Path:** `cur-reports/finops-spendy-cur/`

### Option B: Update Existing Account

1. Go to **Settings** → **Cloud Accounts**
2. Click on your AWS account
3. Add metadata fields:
   ```json
   {
     "curBucketName": "finops-spendy-cur-bucket-123456789012",
     "curReportPath": "cur-reports/finops-spendy-cur/"
   }
   ```

---

## Step 4: Wait for First Report

- **First report appears:** Within 24 hours
- **Update frequency:** Daily
- **Data delay:** ~8-24 hours behind real-time

You can check CUR status:

```bash
# List objects in the bucket
aws s3 ls s3://finops-spendy-cur-bucket-123456789012/cur-reports/finops-spendy-cur/ --recursive
```

---

## Step 5: Verify in CloudOptix

Once CUR data is available:

1. Go to **Dashboard** - should show cost data
2. Go to **Services** page - should show detailed line items
3. Check browser console for logs:
   ```
   [CUR] Found X report(s)
   [CUR] Processing Y cost items
   ```

---

## Troubleshooting

### No Data Showing

**Check 1: Has 24 hours passed?**
```bash
aws s3 ls s3://YOUR-BUCKET-NAME/cur-reports/ --recursive
```
If empty, wait longer.

**Check 2: Correct bucket name in CloudOptix?**
- Go to Settings → Cloud Accounts
- Verify `curBucketName` matches CloudFormation output

**Check 3: IAM permissions?**
```bash
# Test with the CUR credentials
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=wJalr...
aws s3 ls s3://YOUR-BUCKET-NAME/
```

### "Access Denied" Errors

The IAM user needs `s3:GetObject` and `s3:ListBucket` permissions. Verify the bucket policy:

```bash
aws s3api get-bucket-policy --bucket YOUR-BUCKET-NAME
```

### Old Data Not Cleaning Up

The lifecycle policy deletes reports older than 90 days. Check:

```bash
aws s3api get-bucket-lifecycle-configuration --bucket YOUR-BUCKET-NAME
```

---

## Cost Breakdown

### CUR Storage Costs

Typical costs for a medium-sized AWS account:

| Item | Cost |
|------|------|
| S3 Storage (1 GB/month) | $0.023/month |
| S3 Requests (1000 reads/month) | $0.0004/month |
| **Total** | **~$0.03/month** |

### Cost Explorer API (for comparison)

If you queried Cost Explorer 100 times/day:
- 100 requests/day × 30 days = 3,000 requests/month
- 3,000 × $0.01 = **$30/month**

**Savings: $29.97/month = 99.9% reduction**

---

## Advanced: Multiple AWS Accounts

To monitor multiple AWS accounts:

1. Deploy the CloudFormation stack in each account
2. Add each account separately in CloudOptix Settings
3. Each account gets its own CUR bucket

---

## Cleanup

To remove CUR setup:

```bash
# Delete the CloudFormation stack
aws cloudformation delete-stack --stack-name finops-spendy-cur

# Manually delete the S3 bucket (if needed)
aws s3 rb s3://YOUR-BUCKET-NAME --force
```

---

## Next Steps

- ✅ CUR is now your primary data source (FREE)
- ✅ Cost Explorer API is disabled (saves money)
- ✅ All endpoints use CUR data
- 📊 Explore the **Services** page for detailed cost analytics
- 🤖 Generate AI recommendations based on real usage data

---

## Support

If you encounter issues:
1. Check CloudWatch Logs for the Lambda function (if using)
2. Verify S3 bucket permissions
3. Ensure CUR report is generating (check AWS Billing Console)
4. Review CloudOptix server logs for `[CUR]` messages

---

**Remember:** CUR data has a 24-hour delay, but it's 100% free and provides much more detail than Cost Explorer API!
