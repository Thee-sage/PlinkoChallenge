import mongoose, { Document, Schema, Model } from 'mongoose';

// Define methods interface
interface IGameSettingsMethods {
    getDemoBalance(): number;
}

// Extend Document with our methods
export interface IGameSettings extends Document, IGameSettingsMethods {
    // Common settings (used by both main game and demo)
    ballLimit: number;
    maxBallPrice: number;
    dropResetTime: number;
    totalCycleTime: number;
    
    // Main game specific settings
    initialBalance: number;
    
    // Demo specific settings
    demoInitialBalance?: number;
    
    // Ad rotation intervals (in milliseconds)
    standardAdRotationInterval: number;
    sidebarAdRotationInterval: number;
    footerAdRotationInterval: number;
    mobileAdRotationInterval: number;
    
    // Ad display amounts (maximum number of ads to show)
    standardAdCount: number;
    sidebarAdCount: number;
    footerAdCount: number;
    mobileAdCount: number;
    
    // Admin tracking
    lastSignedInBy: string;
}

const gameSettingsSchema = new Schema({
    // Common settings
    ballLimit: {
        type: Number,
        default: 100,
        required: true
    },
    maxBallPrice: {
        type: Number,
        default: 20,
        required: true
    },
    dropResetTime: {
        type: Number,
        default: 60000,
        required: true
    },
    totalCycleTime: {
        type: Number,
        default: 600000,
        required: true
    },
    
    // Main game specific settings
    initialBalance: {
        type: Number,
        default: 200,
        required: true
    },
    
    // Demo specific settings
    demoInitialBalance: {
        type: Number,
        default: 100,
        required: false
    },
    
    // Ad rotation intervals (in milliseconds)
    standardAdRotationInterval: {
        type: Number,
        default: 50000, // 50 seconds
        required: true
    },
    sidebarAdRotationInterval: {
        type: Number,
        default: 75000, // 75 seconds (1.5x standard)
        required: true
    },
    footerAdRotationInterval: {
        type: Number,
        default: 100000, // 100 seconds (2x standard)
        required: true
    },
    mobileAdRotationInterval: {
        type: Number,
        default: 10000, // 10 seconds
        required: true
    },
    
    // Ad display amounts (maximum number of ads to show)
    standardAdCount: {
        type: Number,
        default: 4,
        required: true,
        min: 1,
        max: 5
    },
    sidebarAdCount: {
        type: Number,
        default: 4,
        required: true,
        min: 1,
        max: 5
    },
    footerAdCount: {
        type: Number,
        default: 3,
        required: true,
        min: 1,
        max: 3
    },
    mobileAdCount: {
        type: Number,
        default: 2,
        required: true,
        min: 1,
        max: 2
    },
    
    // Admin tracking
    lastSignedInBy: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Ensure only one settings document exists
gameSettingsSchema.pre('save', async function(this: IGameSettings, next) {
    const GameSettingsModel = mongoose.model('GameSettings') as Model<IGameSettings>;
    if (this.isNew) {
        const count = await GameSettingsModel.countDocuments();
        if (count > 0) {
            next(new Error('Only one settings document can exist'));
        }
    }
    next();
});

// Add validation to ensure demo balance doesn't exceed main balance if it exists
gameSettingsSchema.pre('save', function(this: IGameSettings, next) {
    if (this.demoInitialBalance != null && this.demoInitialBalance > this.initialBalance) {
        next(new Error('Demo initial balance cannot exceed main game initial balance'));
    }
    next();
});

// Add validation for ad counts to ensure they stay within appropriate ranges
gameSettingsSchema.pre('save', function(this: IGameSettings, next) {
    // Validate standard ad count
    if (this.standardAdCount > 5) {
        next(new Error('Standard ad count cannot exceed 5'));
    }
    
    // Validate sidebar ad count
    if (this.sidebarAdCount > 5) {
        next(new Error('Sidebar ad count cannot exceed 5'));
    }
    
    // Validate footer ad count
    if (this.footerAdCount > 3) {
        next(new Error('Footer ad count cannot exceed 3'));
    }
    
    // Validate mobile ad count
    if (this.mobileAdCount > 2) {
        next(new Error('Mobile ad count cannot exceed 2'));
    }
    
    next();
});

// Helper method to get demo balance
gameSettingsSchema.methods.getDemoBalance = function(this: IGameSettings): number {
    return this.demoInitialBalance ?? this.initialBalance / 2;
};

export const GameSettings = mongoose.model<IGameSettings>('GameSettings', gameSettingsSchema);