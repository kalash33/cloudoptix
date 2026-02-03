# CloudOptix - Development Changelog

## [Unreleased]

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
