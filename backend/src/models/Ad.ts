import mongoose, { Model, Document, Schema, CallbackError } from 'mongoose';

interface IAdDocument extends Document {
  title: string;
  description: string;
  link: string;
  rating: number;
  imageUrl?: string;
  service: 'GoogleAdSense' | 'Custom';
  location: string;
  isShowInMainPage: boolean;
  percentageInHomePage: number;
  orderInCasinosPage: number;
  checkIsNewAd(): boolean;
  createdBy: { email: string; timestamp: Date };
  casino: Schema.Types.ObjectId;
  lastEditedBy: { email: string; timestamp: Date };
}

interface AdModel extends Model<IAdDocument> {
  validateTotalPercentage(this: Model<IAdDocument>, newPercentage: number, excludeId?: string): Promise<boolean>;
  validateUniqueOrder(this: Model<IAdDocument>, order: number, excludeId?: string): Promise<boolean>;
}

const adminActionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const adSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  link: { type: String, required: true },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    validate: {
      validator: function(v: number) {
        return !isNaN(v) && v >= 0 && v <= 5 && 
               Number(v.toFixed(1)) === v;
      },
      message: (props: { value: number }) => 
        `${props.value} is not a valid rating! Must be between 0 and 5 with at most 1 decimal place.`
    }
  },
  image: { data: Buffer, contentType: String },
  imageUrl: {
    type: String,
    default: '/default-placeholder.jpg',
    required: false
  },
  service: {
    type: String,
    enum: ['GoogleAdSense', 'Custom'],
    default: 'Custom'
  },
  location: {
    type: String,
    required: true
  },
  isShowInMainPage: {
    type: Boolean,
    default: false
  },
  percentageInHomePage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    validate: {
      validator: async function(this: IAdDocument, v: number) {
        if (!this.isShowInMainPage || this.location !== 'MainContent') {
          return true;
        }
        const Ad = mongoose.model<IAdDocument, AdModel>('Ad');
        return await Ad.validateTotalPercentage(v, this._id?.toString());
      },
      message: 'Total percentage for MainContent ads cannot exceed 100%'
    }
  },
  orderInCasinosPage: {
    type: Number,
    default: 0,
    validate: {
      validator: async function(this: IAdDocument, v: number) {
        if (this.location !== 'MainContent') {
          return true;
        }
        const Ad = mongoose.model<IAdDocument, AdModel>('Ad');
        return await Ad.validateUniqueOrder(v, this._id?.toString());
      },
      message: 'This order number is already taken'
    }
  },
  casino: {
    type: Schema.Types.ObjectId,
    ref: 'Casino',
    required: false
  },
  createdBy: {
    type: adminActionSchema,
    required: true
  },
  lastEditedBy: {
    type: adminActionSchema,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
adSchema.index({ location: 1 });
adSchema.index({ orderInCasinosPage: 1 });
adSchema.index({ 'createdBy.email': 1 });
adSchema.index({ 'lastEditedBy.email': 1 });
adSchema.index({ casino: 1 });

// Methods
adSchema.methods.checkIsNewAd = function(this: IAdDocument): boolean {
  return this._id === undefined;
};

// Static methods using statics property
adSchema.statics = {
  async validateTotalPercentage(
    this: Model<IAdDocument>,
    newPercentage: number,
    excludeId?: string
  ): Promise<boolean> {
    const query: any = {
      location: 'MainContent',
      isShowInMainPage: true
    };
    
    if (excludeId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const ads = await this.find(query);
    const totalPercentage = ads.reduce((sum: number, ad: IAdDocument) => 
      sum + (ad.percentageInHomePage || 0), 0);
    
    return (totalPercentage + newPercentage) <= 100;
  },

  async validateUniqueOrder(
    this: Model<IAdDocument>,
    order: number,
    excludeId?: string
  ): Promise<boolean> {
    const query: any = {
      location: 'MainContent',
      orderInCasinosPage: order
    };

    if (excludeId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const existingAd = await this.findOne(query);
    return !existingAd;
  }
};

// Pre-save middleware
adSchema.pre('save', async function(this: IAdDocument, next: (err?: CallbackError) => void) {
  try {
    if (this.location === 'MainContent') {
      if (this.isShowInMainPage) {
        const Ad = mongoose.model<IAdDocument, AdModel>('Ad');
        const isValidPercentage = await Ad.validateTotalPercentage(
          this.percentageInHomePage,
          this._id?.toString()
        );
        if (!isValidPercentage) {
          throw new Error('Total percentage for MainContent ads cannot exceed 100%');
        }
      }
      
      const Ad = mongoose.model<IAdDocument, AdModel>('Ad');
      const isValidOrder = await Ad.validateUniqueOrder(
        this.orderInCasinosPage,
        this._id?.toString()
      );
      if (!isValidOrder) {
        throw new Error('This order number is already taken');
      }
    }

    if (this.casino) {
      await mongoose.model('Casino').findByIdAndUpdate(
        this.casino,
        { $addToSet: { ads: this._id } },
        { new: true }
      );
    }

    next();
  } catch (error) {
    next(error as CallbackError);
  }
});

// Pre-deleteOne middleware
adSchema.pre('deleteOne', { document: true, query: false }, async function(this: IAdDocument) {
  if (this.casino) {
    await mongoose.model('Casino').findByIdAndUpdate(
      this.casino,
      { $pull: { ads: this._id } }
    );
  }
});

export const Ad = mongoose.model<IAdDocument, AdModel>('Ad', adSchema);