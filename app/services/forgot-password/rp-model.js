import mongoose from 'mongoose';
import {
	DEF_COLLECTION_NAME,
	DEF_METHOD,
	DEF_MODEL_NAME
} from './constants';

const ObjectId = mongoose.Schema.Types.ObjectId;

export const RPSchema = new mongoose.Schema({
	code:        { type: String },
	email:       { type: String },
	account:     { type: ObjectId, required: true, refPath: 'accountName' },
	accountName: { type: String, required: true },
	expireAt:    { type: Date, required: true },
	used:        { type: Boolean, required: true, default: false },
	type:        { type: String, required: true, default: DEF_METHOD }
}, {
	minimize: false,
	collection: DEF_COLLECTION_NAME
});

RPSchema.index({ code: 1, email: 1 }, { unique: true });
RPSchema.index({ expireAt: 1 }, { expireAfterSeconds: 1 });

export default mongoose.model(DEF_MODEL_NAME, RPSchema);
