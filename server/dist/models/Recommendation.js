"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationModel = void 0;
const dynamoose = __importStar(require("dynamoose"));
const crypto_1 = __importDefault(require("crypto"));
const recommendationSchema = new dynamoose.Schema({
    id: {
        type: String,
        hashKey: true,
        default: () => crypto_1.default.randomUUID(),
    },
    accountId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
        index: [
            {
                name: 'userId-status-index',
                type: 'global',
                rangeKey: 'status',
            },
            {
                name: 'userId-type-index',
                type: 'global',
                rangeKey: 'type',
            }
        ]
    },
    type: {
        type: String,
        enum: ['rightsizing', 'unused', 'commitment', 'service-switch', 'migration'],
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    resourceId: {
        type: String,
        required: true,
    },
    resourceName: {
        type: String,
        required: true,
    },
    service: {
        type: String,
        required: true,
    },
    provider: {
        type: String,
        enum: ['aws', 'gcp', 'azure'],
        required: true,
    },
    currentCost: {
        type: Number,
        required: true,
    },
    projectedCost: {
        type: Number,
        required: true,
    },
    savings: {
        type: Number,
        required: true,
    },
    savingsPercent: {
        type: Number,
        required: true,
    },
    effort: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true,
    },
    risk: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'dismissed', 'applied'],
        default: 'active',
    },
    implementationSteps: {
        type: Array,
        schema: [String],
    },
    detectedAt: {
        type: Date,
        default: () => new Date(),
    },
    appliedAt: Date,
}, {
    timestamps: true,
});
exports.RecommendationModel = dynamoose.model('Recommendation', recommendationSchema);
exports.default = exports.RecommendationModel;
//# sourceMappingURL=Recommendation.js.map