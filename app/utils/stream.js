import through from 'through';
import { Transform } from 'stream';

export function mapStream(callback, params) {
	return new MapStream(params, callback);
}

export function reduceStream(fn, acc) {
	if (arguments.length < 2) {
		throw new Error('Initial value must be given');
	}

	return through(function(data) {
		acc = fn(acc, data);
	}, function() {
		this.emit('data', acc);
		this.emit('end', acc);
	});
}

export function isStream(stream) {
	return stream !== null &&
		typeof stream === 'object' &&
		typeof stream.pipe === 'function';
}

class MapStream extends Transform {
	constructor(params = {}, callback) {
		super({ objectMode: true });

		this.params = params;
		this.callback = callback;
	}

	_transform(chunk, encoding, callback) {
		const item = chunk.toJSON ? chunk.toJSON() : chunk;
		let result;

		try {
			result = this.callback(item, this.params);
		} catch (err) {
			callback(err);
		}

		if (result.then) {
			result
				.then((...data) => {
					try {
						callback(null, ...data);
					} catch (err) {
						console.error(err);
						// nothing
					}
				})
				.catch(callback);
		} else {
			callback(null, result);
		}
	}
}
