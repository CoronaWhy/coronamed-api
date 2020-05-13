import mongoose from 'mongoose';
import _get from 'lodash/get';
import { Transform } from 'stream';

/**
 * A lib to compute virtual property on fly
 * @param  {Object} opts
 * @return {TrasnformStream}
 */
export default function mongooseComputeVirtuals(opts) {
	if (typeof opts === 'string') {
		opts = { modelName: opts };
	}

	const stream = new MongooseComputeVirtuals(opts);
	return stream;
}

mongooseComputeVirtuals.single = _compute;

class MongooseComputeVirtuals extends Transform {
	constructor({ docPath, modelName } = {}) {
		super({ objectMode: true });

		this.docPath = docPath;
		this.model = mongoose.model(modelName);
	}

	_transform(chunk, encoding, callback) {
		const doc = this.docPath ? _get(chunk, this.docPath) : chunk;

		if (!doc) {
			console.warn(this.docPath, 'path not exists');
			return callback(null, chunk);
		}

		_compute(doc, this.model);
		callback(null, chunk);
	}
}

function _compute(doc, model) {
	if (typeof model === 'string') {
		model = mongoose.model(model);
	}

	if (!model) {
		throw new TypeError('Failed to detect mongoose model.');
	}

	const virtuals = model.schema.virtuals;

	Object.keys(virtuals).forEach(keyName => {
		const getters = virtuals[keyName].getters;

		if (keyName === 'id') return;
		if (getters.length !== 1) return;


		const value  = getters[0].call(doc);
		doc[keyName] = value;

		// Object.defineProperty(doc, keyName, {
		// 	get: getters[0],
		// 	enumerable: true
		// });
	});

	return doc;
}
