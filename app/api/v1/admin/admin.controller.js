import mongoose from 'mongoose';
import { EventTracker } from 'models';

const ObjectId = mongoose.Types.ObjectId;

export async function searchLogEvents(ctx) {
	const { after, before, section, name, latest } = ctx.query;
	const criteria = { section, name };

	const limit = parseInt(ctx.query.limit) || 10;

	let isReverseSearch = false;

	if (after) {
		if (!ObjectId.isValid(after)) {
			ctx.throw(400, 'invalid after id');
		}

		criteria._id = { $gt: new ObjectId(after) };
	}

	if (before) {
		if (!ObjectId.isValid(before)) {
			ctx.throw(400, 'invalid before id');
		}

		criteria._id = { $lt: new ObjectId(before) };
	}

	Object.keys(criteria).forEach(key => {
		if (criteria[key] === undefined) {
			delete criteria[key];
		}
	});

	Object.keys(ctx.query).forEach(key => {
		if (key.split('.')[0] !== 'metadata') return;
		criteria[key] = JSON.parse(ctx.query[key]);
	});

	if (latest === 'true' || before) {
		isReverseSearch = true;
	}

	if (isReverseSearch) {
		const result = await EventTracker.find(criteria)
			.lean()
			.sort({ date: -1 })
			.limit(limit);

		ctx.body = result.reverse();
	} else {
		ctx.jsonStream = true;
		ctx.body = EventTracker.find(criteria)
			.lean()
			.sort({ date: 1 })
			.limit(limit)
			.cursor();
	}
}
