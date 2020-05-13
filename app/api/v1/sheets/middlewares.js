import mongoose from 'mongoose';
import { Sheet } from 'models';

const ObjectId = mongoose.Types.ObjectId;

export async function ensureResourceById(id, ctx, next) {
	if (!ObjectId.isValid(id)) {
		ctx.throw(404);
	}

	const doc = await Sheet.findById(id);

	if (!doc) {
		ctx.throw(404);
	}

	ctx.state.sheet = doc;
	return next();
}
