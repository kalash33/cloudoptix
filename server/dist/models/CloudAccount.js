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
exports.CloudAccountModel = void 0;
const dynamoose = __importStar(require("dynamoose"));
const crypto_1 = __importDefault(require("crypto"));
const cloudAccountSchema = new dynamoose.Schema({
    id: {
        type: String,
        hashKey: true,
        default: () => crypto_1.default.randomUUID(),
    },
    userId: {
        type: String,
        required: true,
        index: {
            name: 'userId-provider-index',
            type: 'global',
            rangeKey: 'provider'
        },
    },
    provider: {
        type: String,
        enum: ['aws', 'gcp', 'azure'],
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    accountId: {
        type: String,
        required: true,
    },
    encryptedCredentials: {
        type: String,
        required: false,
    },
    authType: {
        type: String,
        enum: ['keys', 'role'],
        default: 'keys',
    },
    roleArn: {
        type: String,
    },
    externalId: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'connected', 'error', 'syncing'],
        default: 'pending',
    },
    lastSyncAt: {
        type: Date,
    },
    lastSyncError: {
        type: String,
    },
    metadata: {
        type: Object,
        schema: {
            region: String,
            bigQueryDataset: String,
            tenantId: String,
            curBucketName: String,
            curReportPath: String,
            curRegion: String,
            isMock: Boolean,
        }
    },
}, {
    timestamps: true,
});
exports.CloudAccountModel = dynamoose.model('CloudAccount', cloudAccountSchema);
exports.default = exports.CloudAccountModel;
//# sourceMappingURL=CloudAccount.js.map