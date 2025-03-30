import mongoose, { Model, Document, Schema } from 'mongoose';

// Interfaces for nested structures
interface IPaymentMethod {
  name: string;
  processingTime: string;
  minDeposit: number;
  maxWithdrawal: number;
  fees: string;
}

interface IContentSection {
  title: string;
  content: string;
  order: number;
}

interface IRating {
  score: number;
  category: string;
  description?: string;
}

interface IFreeSpinsConditions {
  wageringRequirement: number;
  maxCashout: number;
  expirationDays: number;
}

interface IDepositBonus {
  minDeposit: number;
  maxCashout: number;
  excludedPaymentMethods: string[];
  wageringRequirement: number;
  bonusExpirationDays: number;
  processingSpeed: string;
  freeSpinsConditions: IFreeSpinsConditions;
  bonusPercentage: number;
  increasedBonusPercentage?: number;
  increasedBonusTimeLimit?: number; // in minutes
  claimTimeLimit: number; // in days
  currencies: {
    currency: string;
    minDeposit: number;
  }[];
}

export interface ITermsAndConditions {
  firstDepositBonus: IDepositBonus;
  generalTerms: string[];
  eligibilityRequirements: string[];
  restrictedCountries?: string[];
  additionalNotes?: string[];
}

export interface ICasinoDocument extends Document {
  // Basic Information
  name: string;
  description: string;
  logo: string;
  website: string;
  established: number;
  offer: string;

  // Ratings
  ourRating: number;
  trustIndex: 'Low' | 'Medium' | 'High';
  categoryRatings: IRating[];

  // Terms and Conditions
  termsAndConditions: ITermsAndConditions;

  // Financial Information
  payoutRatio: {
    percentage: number;
    lastUpdated: Date;
  };
  payoutSpeed: {
    averageDays: string;
    details: string;
  };

  // Licensing & Security
  licenses: string[];
  securityMeasures: string[];
  fairnessVerification: string[];

  // Payment Information
  paymentMethods: IPaymentMethod[];
  currencies: string[];
  minDeposit: number;
  maxPayout: number;

  // Content Sections
  contentSections: IContentSection[];

  // Pros and Cons
  advantages: string[];
  disadvantages: string[];

  // Administrative
  isActive: boolean;
  orderInListing: number;
  createdBy: { email: string; timestamp: Date };
  lastEditedBy: { email: string; timestamp: Date };
  ads: Schema.Types.ObjectId[];
}

interface CasinoModel extends Model<ICasinoDocument> {
  validateUniqueOrder(order: number, excludeId?: string): Promise<boolean>;
}

const ratingSchema = new Schema({
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    validate: {
      validator: (v: number): boolean => {
        return /^\d(\.\d)?$/.test(v.toString()) && v <= 5;
      },
      message: 'Rating must be between 0 and 5 with at most 1 decimal place'
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['Games', 'Support', 'Banking', 'Mobile', 'User Experience']
  },
  description: String
});

const paymentMethodSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  processingTime: {
    type: String,
    required: true
  },
  minDeposit: {
    type: Number,
    required: true,
    min: 0
  },
  maxWithdrawal: {
    type: Number,
    required: true,
    min: 0
  },
  fees: {
    type: String,
    required: true
  }
});

const contentSectionSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  }
});

const freeSpinsConditionsSchema = new Schema({
  wageringRequirement: {
    type: Number,
    required: true
  },
  maxCashout: {
    type: Number,
    required: true
  },
  expirationDays: {
    type: Number,
    required: true
  }
});

const depositBonusSchema = new Schema({
  minDeposit: {
    type: Number,
    required: true
  },
  maxCashout: {
    type: Number,
    required: true
  },
  excludedPaymentMethods: [{
    type: String,
    required: true
  }],
  wageringRequirement: {
    type: Number,
    required: true
  },
  bonusExpirationDays: {
    type: Number,
    required: true
  },
  processingSpeed: {
    type: String,
    required: true
  },
  freeSpinsConditions: {
    type: freeSpinsConditionsSchema,
    required: true
  },
  bonusPercentage: {
    type: Number,
    required: true
  },
  increasedBonusPercentage: {
    type: Number
  },
  increasedBonusTimeLimit: {
    type: Number
  },
  claimTimeLimit: {
    type: Number,
    required: true
  },
  currencies: [{
    currency: {
      type: String,
      required: true
    },
    minDeposit: {
      type: Number,
      required: true
    }
  }]
});

const termsAndConditionsSchema = new Schema({
  firstDepositBonus: {
    type: depositBonusSchema,
    required: true
  },
  generalTerms: [{
    type: String,
    required: true
  }],
  eligibilityRequirements: [{
    type: String,
    required: true
  }],
  restrictedCountries: [String],
  additionalNotes: [String]
});

const adminActionSchema = new Schema({
  email: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const casinoSchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    required: true
  },
  website: {
    type: String,
    required: true
  },
  established: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear()
  },

  // Ratings
  ourRating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    validate: {
      validator: (v: number): boolean => {
        const formatted = v.toFixed(1);
        const numValue = parseFloat(formatted);
        return numValue >= 0 && numValue <= 5 && 
               /^\d+\.\d$/.test(formatted);
      },
      message: 'Rating must be between 0 and 5 with at most 1 decimal place'
    }
  },
  trustIndex: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  categoryRatings: {
    type: [ratingSchema],
    validate: {
      validator: function(ratings: IRating[]) {
        if (!Array.isArray(ratings)) return false;
        const requiredCategories = ['Games', 'Support', 'Banking', 'Mobile', 'User Experience'];
        const providedCategories = ratings.map(rating => rating.category);
        return requiredCategories.every(category => {
          const rating = ratings.find(r => r.category === category);
          if (!rating) return false;
          const score = parseFloat(rating.score.toFixed(1));
          return score >= 0 && score <= 5;
        });
      },
      message: 'All required categories must be provided with valid ratings between 0 and 5'
    }
  },

  // Terms and Conditions
  termsAndConditions: {
    type: termsAndConditionsSchema,
    required: true
  },

  // Financial Information
  payoutRatio: {
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: {
        validator: (v: number): boolean => {
          return /^\d{1,2}(\.\d{1,2})?$/.test(v.toString());
        },
        message: 'Payout ratio must be between 0 and 100 with at most 2 decimal places'
      }
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  payoutSpeed: {
    averageDays: {
      type: String,
      required: true,
      validate: {
        validator: (v: string): boolean => {
          return v.trim().length > 0;
        },
        message: 'Payout speed average days cannot be empty'
      }
    },
    details: String
  },

  // Licensing & Security
  licenses: [{
    type: String,
    required: true
  }],
  securityMeasures: [String],
  fairnessVerification: [String],

  // Payment Information
  paymentMethods: [paymentMethodSchema],
  currencies: [{
    type: String,
    required: true
  }],
  minDeposit: {
    type: Number,
    required: true,
    min: 0
  },
  maxPayout: {
    type: Number,
    required: true,
    min: 0
  },

  // Content Sections
  contentSections: [contentSectionSchema],

  // Pros and Cons
  advantages: [{
    type: String
  }],
  disadvantages: [{
    type: String
  }],
  offer: {
    type: String,
    trim: true,
    default: ''
  },

  // Administrative
  isActive: {
    type: Boolean,
    default: true
  },
  orderInListing: {
    type: Number,
    required: true
  },
  createdBy: {
    type: adminActionSchema,
    required: true
  },
  lastEditedBy: {
    type: adminActionSchema,
    required: true
  },
  ads: [{
    type: Schema.Types.ObjectId,
    ref: 'Ad'
  }]
}, {
  timestamps: true
});

// Indexes
casinoSchema.index({ name: 1 });
casinoSchema.index({ orderInListing: 1 });
casinoSchema.index({ 'createdBy.email': 1 });
casinoSchema.index({ 'lastEditedBy.email': 1 });
casinoSchema.index({ isActive: 1 });

// Static methods
casinoSchema.statics.validateUniqueOrder = async function(
  order: number,
  excludeId?: string
): Promise<boolean> {
  const query: any = { orderInListing: order };
  
  if (excludeId) {
      query._id = { $ne: excludeId };
  }
  
  const existingCasino = await this.findOne(query);
  return !existingCasino;
};

export const Casino = mongoose.model<ICasinoDocument, CasinoModel>('Casino', casinoSchema);