"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// CUR Migration - Force restart 4
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const costs_1 = __importDefault(require("./routes/costs"));
const recommendations_1 = __importDefault(require("./routes/recommendations"));
const chat_1 = __importDefault(require("./routes/chat"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production' ? true : (process.env.FRONTEND_URL || 'http://localhost:3000'),
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' })); // Larger limit for GCP service account keys
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), query: req.query, originalUrl: req.originalUrl });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/accounts', accounts_1.default);
app.use('/api/costs', costs_1.default);
app.use('/api/recommendations', recommendations_1.default);
app.use('/api/chat', chat_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});
// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await (0, database_1.default)();
        app.listen(PORT, () => {
            console.log(`🚀 CloudOptix Server running on port ${PORT}`);
            console.log(`📊 API available at http://localhost:${PORT}/api`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map