/**
 * A simple key value storage of variable in database
 */

import mongoose from 'mongoose';

const Mixed = mongoose.Schema.Types.Mixed;

const Schema = new mongoose.Schema({
	_id:   { type: String },
	value: { type: Mixed }
}, {
	collection: 'variables',
	minimize: false,
	versionKey: false
});

Schema.statics.get = async function get(key, defValue) {
	const obj = await Variable.findById(key).lean();

	if (obj && obj.value !== undefined) {
		return obj.value;
	}

	return defValue;
};

Schema.statics.set = function set(key, value) {
	const opts = { upsert: true, new: true };
	return Variable.findOneAndUpdate({ _id: key }, { value }, opts);
};

const Variable = mongoose.model('Variable', Schema);
export default Variable;
