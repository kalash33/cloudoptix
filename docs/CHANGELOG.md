# CloudOptix - Development Changelog

## [Unreleased]

### February 23, 2026
#### Added
- AWS Cost and Usage Reports (CUR) service integration
- CloudFormation template (`public/aws-cur-setup.yaml`) for automated CUR setup
- Service-level cost analytics page (`/services`) with:
  - Real-time cost tracking per service and usage type
  - Month-end projections with confidence scoring
  - Interactive donut charts for cost distribution
  - Advanced filtering by provider and search
  - Animated statistics and progress indicators
- CUR service (`server/src/services/aws/curService.ts`) for S3-based cost data retrieval
- Support for CUR bucket configuration in CloudAccount model
- Free alternative to Cost Explorer API (no API charges)

#### Changed
- Updated CloudAccount model to include `curBucketName` and `curReportPath` metadata fields
- Enhanced costs API with `/api/costs/services` endpoint for granular service data

### February 3, 2026
#### Added
- Project status documentation in `docs/` folder
- Frontend performance optimizations (React.memo, modular imports)
- Updated AWS onboarding with 7-step flow and accurate IAM permissions
- Empty states for all pages when no cloud accounts connected

#### Fixed
- Removed all mock data from Settings page
- Fixed runtime errors from undefined mock data references

#### Changed
- Settings page now fetches real accounts from API
- Dashboard dynamically calculates budget limits

---

## [0.1.0] - February 2026

### Added
- Initial MVP release
- User authentication (signup/login)
- Dashboard with cost overview
- AWS onboarding wizard
- Recommendations page
- Resources page
- Kubernetes page
- Commitments page
- Budgets & Alerts page
- Codebase Analysis page
- Settings page

### Technical
- Next.js 16 with Turbopack
- Express.js backend
- MongoDB Atlas database
- JWT authentication
