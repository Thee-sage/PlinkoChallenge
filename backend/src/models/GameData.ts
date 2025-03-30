import mongoose, { Document, Schema } from 'mongoose';

export interface IGameData extends Document {
    uid: string;
    balance: number; // Default pulled from game settings
}

const gameDataSchema: Schema<IGameData> = new Schema({
    uid: { type: String, required: true, unique: true },
    balance: { type: Number, default: 200 },
});

export const GameData = mongoose.model<IGameData>('GameData', gameDataSchema);
