# CloudOptix

**AI-Powered Multi-Cloud Cost Optimization Platform**

CloudOptix is a comprehensive FinOps solution that helps organizations monitor, analyze, and reduce their cloud spending across AWS, GCP, and Azure from a single unified dashboard.

![Dashboard Overview](file:///Users/kalashpoddar/.gemini/antigravity/brain/ea7f32ee-356c-4eca-94ba-07268f02eb08/dashboard_overview_1769860401610.png)

---

## 🎯 Problem Statement

Organizations using multiple cloud providers face critical challenges:

| Challenge | Impact |
|-----------|--------|
| **Scattered Cost Data** | Bills from 3+ providers with different formats |
| **Wasted Spending** | Underutilized resources, forgotten instances, oversized VMs |
| **Lack of Visibility** | No unified view of total cloud costs |
| **Manual Analysis** | Engineers spending hours identifying optimization opportunities |
| **Security Concerns** | Storing cloud credentials safely |

CloudOptix solves all of these with a single, secure platform.

---

## ✨ Key Features

### 1. Unified Dashboard
Single-pane view of your entire cloud infrastructure:
- Total monthly spend across all providers
- Potential savings identified
- Resources analyzed
- Spending trend charts with 7-day forecasts
- Cloud spend distribution (AWS/GCP/Azure breakdown)

### 2. AI-Powered Recommendations
Uses **GPT-OSS 120B** via Cloudflare AI Gateway to generate intelligent cost optimization suggestions:

| Type | Description | Example Savings |
|------|-------------|-----------------|
| **Rightsizing** | Downsize underutilized instances | $91/mo per instance |
| **Service Switch** | Migrate to serverless/spot | Up to 90% reduction |
| **Unused Resources** | Delete unattached volumes | 100% recovery |
| **Commitments** | Purchase Reserved Instances | 35% savings |
| **Migration** | Move to cheaper alternatives | 50% savings |

![AI Recommendations](file:///Users/kalashpoddar/.gemini/antigravity/brain/ea7f32ee-356c-4eca-94ba-07268f02eb08/recommendations_page_1769860425267.png)

### 3. Resource Inventory
Complete inventory with utilization metrics:
- CPU/Memory utilization per resource
- Cost attribution
- Status tracking (running, stopped, idle)
- Per-resource recommendations

![Resource Inventory](file:///Users/kalashpoddar/.gemini/antigravity/brain/ea7f32ee-356c-4eca-94ba-07268f02eb08/resources_page_1769860451274.png)

### 4. Kubernetes Cost Allocation
Namespace-level cost tracking:
- EKS (AWS), GKE (GCP), AKS (Azure) clusters
- Pod counts and per-namespace costs
- Multi-cluster aggregation

![Kubernetes Costs](file:///Users/kalashpoddar/.gemini/antigravity/brain/ea7f32ee-356c-4eca-94ba-07268f02eb08/kubernetes_page_1769860489624.png)

### 5. Commitment Management
Track Reserved Instances and Savings Plans:
- Coverage rate tracking
- Utilization efficiency monitoring
- Expiration alerts

![Commitments](file:///Users/kalashpoddar/.gemini/antigravity/brain/ea7f32ee-356c-4eca-94ba-07268f02eb08/commitments_page_1769860907753.png)

### 6. Budgets & Alerts
Proactive cost control:
- Set spending limits per account/service
- Alert thresholds (80%, 100%)
- Forecasted spend projections

![Budgets & Alerts](file:///Users/kalashpoddar/.gemini/antigravity/brain/ea7f32ee-356c-4eca-94ba-07268f02eb08/budgets_page_1769860950214.png)

### 7. Codebase Analysis
Scan repositories for cloud optimization opportunities:
- Lambda-fit functions (serverless candidates)
- Container-ready services
- Cloud-agnostic patterns
- Provider lock-in detection

![Codebase Analysis](file:///Users/kalashpoddar/.gemini/antigravity/brain/ea7f32ee-356c-4eca-94ba-07268f02eb08/codebase_page_1769860998897.png)

### 8. Service-Level Cost Analytics
Detailed cost breakdown by service and usage type:
- Real-time cost tracking per service
- Month-end projections with confidence scores
- Cost distribution visualizations
- Usage type granularity
- Multi-provider filtering and search

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│              Next.js 16 + React + TypeScript                 │
│                    Glassmorphism UI                          │
│                    Port: 3000                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│              Node.js + Express + TypeScript                  │
│                    Port: 5001                                │
├─────────────────────────────────────────────────────────────┤
│ Auth       │ JWT + bcrypt password hashing                   │
│ Encryption │ AES-256-GCM for cloud credentials               │
│ AI         │ GPT-OSS 120B via Cloudflare AI Gateway          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CLOUD SDKs                              │
│ AWS Cost Explorer │ GCP BigQuery │ Azure Cost Management    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│                    MongoDB Atlas                             │
│     Users, CloudAccounts, CostData, Recommendations         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security

| Feature | Implementation |
|---------|----------------|
| **Authentication** | JWT with 7-day expiration |
| **Password Storage** | bcrypt with salt rounds |
| **Credential Encryption** | AES-256-GCM at rest |
| **Cloud Access** | Read-only permissions only |
| **Protected Routes** | All pages require auth |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Cloud provider accounts (AWS/GCP/Azure)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd finopsspendy

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
```

### Environment Setup

**Backend** (`server/.env`):
```env
PORT=5001
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-byte-hex-key
CLOUDFLARE_API_TOKEN=your-cloudflare-token
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5001
```

### Running the Application

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend (in root directory)
npm run dev
```

Access the application at **http://localhost:3000**

### AWS Cost and Usage Reports (CUR) Setup

For detailed cost data without API charges, deploy the CloudFormation template:

```bash
# Deploy CUR setup (one-time)
aws cloudformation create-stack \
  --stack-name finops-spendy-cur \
  --template-body file://public/aws-cur-setup.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=S3BucketName,ParameterValue=your-unique-bucket-name

# Wait for stack creation
aws cloudformation wait stack-create-complete --stack-name finops-spendy-cur

# Get outputs (S3 bucket name and credentials)
aws cloudformation describe-stacks --stack-name finops-spendy-cur --query 'Stacks[0].Outputs'
```

Note: First CUR data appears within 24 hours of setup.

### Demo Credentials
| Field | Value |
|-------|-------|
| Email | `demo@cloudoptix.io` |
| Password | `Demo123456` |

---

## 📁 Project Structure

```
finopsspendy/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── contexts/          # Auth context
│   └── lib/               # API client, utilities
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── models/        # MongoDB schemas
│   │   ├── services/      # Cloud SDK integrations
│   │   ├── middleware/    # Auth middleware
│   │   └── utils/         # Encryption helpers
│   └── package.json
│
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Custom CSS, Glassmorphism |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB Atlas |
| **Auth** | JWT, bcrypt |
| **AI** | GPT-OSS 120B via Cloudflare |
| **Cloud SDKs** | AWS SDK, GCP SDK, Azure SDK |

---

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new user |
| `/api/auth/login` | POST | Authenticate user |
| `/api/auth/me` | GET | Get current user |
| `/api/accounts` | GET/POST | Manage cloud accounts |
| `/api/costs/summary` | GET | Cost overview |
| `/api/costs/daily` | GET | Daily cost trend |
| `/api/costs/services` | GET | Service-level cost breakdown |
| `/api/recommendations` | GET | List recommendations |
| `/api/recommendations/generate` | POST | Generate AI recommendations |

---

## 📜 License

MIT License - feel free to use this project for your own FinOps needs.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ for cloud cost optimization
