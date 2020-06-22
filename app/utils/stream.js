import { PassThrough } from 'stream';
import through2 from 'through2';

const NULL_FLUSH_FN     = (callback) => callback();
const NULL_TRANSFORM_FN = (chunk) => chunk;

export function streamCombiner(...streams) {
	const combiner = new StreamCombiner(streams);
	return combiner;
}

export function mapStream(transform = NULL_TRANSFORM_FN, options = {}) {
	// parse object arguemnt way
	if (typeof transform === 'object') {
		options = transform.options;
		transform = transform.transform;
	}

	options = {
		objectMode: true,
		highWaterMark: 16,
		...(options || {}),
	};

	const flatMode = !!options.flatMode;

	const Map = through2.ctor(options, function(chunk, encoding, callback) {
		if (this.options.wantStrings) chunk = chunk.toString();

		const next = (err, data) => {
			if (err) return callback(err);

			if (flatMode && Array.isArray(data)) {
				data.forEach(chunk => this.push(chunk));
			} else {
				this.push(data);
			}

			return callback();
		};

		try {
			const fnResult = transform.call(this, chunk, this._index++);

			// process as async function
			if (fnResult && fnResult.then) {
				return fnResult
					.then((result) => next(null, result))
					.catch((err) => next(err));
			}

			return next(null, fnResult);
		} catch (err) {
			return callback(err);
		}
	});

	Map.prototype._index = 0;

	return Map();
}

export function filterStream(transform = NULL_TRANSFORM_FN, options = {}) {
	options = {
		objectMode: true,
		highWaterMark: 16,
		...(options || {}),
	};

	const Filter = through2.ctor(options, function(chunk, encoding, callback) {
		if (this.options.wantStrings) chunk = chunk.toString();

		const next = (err, data) => {
			if (err) return callback(err);
			if (data) {
				this.push(chunk);
			}

			return callback();
		};

		try {
			const fnResult = transform.call(this, chunk, this._index++);

			// process as async function
			if (fnResult && fnResult.then) {
				return fnResult
					.then((result) => next(null, result))
					.catch((err) => next(err));
			}

			return next(null, fnResult);
		} catch (err) {
			return callback(err);
		}
	});

	Filter.prototype._index = 0;

	return Filter();
}

export function trasnformToBatchStream({
	size = 10,
	options = {},
	transform = NULL_TRANSFORM_FN,
	flush = NULL_FLUSH_FN
} = {}) {
	options = {
		objectMode: true,
		highWaterMark: 16,
		...(options || {}),
	};

	const batchSize = size || 10;

	const _buffer = [];

	const transformFn = function transformFunction(chunk, enc, callback) {
		const next = (err, data) => {
			if (err) return callback(err);
			// add to buffer
			_buffer.push(data);
			// still buffering
			if (_buffer.length < batchSize) return callback();
			// push buffer
			const batch = _buffer.splice(0, batchSize);

			if (options.objectMode) {
				return callback(null, batch);
			}

			const batchString = batch.reduce((prev, curr) => {
				return prev.concat(curr.toString());
			}, '');

			return callback(null, batchString);
		};

		try {
			const fnResult = transform.call(this, chunk, enc);

			// process as async function
			if (fnResult && fnResult.then) {
				return fnResult
					.then((result) => next(null, result))
					.catch((err) => next(err));
			}

			return next(null, fnResult);
		} catch (err) {
			return callback(err);
		}
	};

	const flushFn = function flushFunction(callback) {
		// push remaining buffer
		const batch = _buffer.splice(0, _buffer.length);

		if (batch.length > 0) {
			if (options.objectMode) {
				this.push(batch);
			} else {
				const batchString = batch.reduce((prev, curr) => {
					return prev.concat(curr.toString());
				}, '');

				this.push(batchString);
			}
		}
		// and flush
		flush.call(this, callback);
	};

	return through2(options, transformFn, flushFn).on('finish', function() {
		// emit end event to handling via promise
		this.emit('end', this._reduction);
	});
}

export function reduceStream(fn, initial, options = {}) {
	options = {
		objectMode: true,
		highWaterMark: 16,
		...(options || {}),
	};

	const transformFn = function transformFunction(chunk, encoding, callback) {
		if (this.options.wantStrings) chunk = chunk.toString();

		// First chunk with no initial value set
		if (this._reduction === undefined && this._index == 0) {
			this._reduction = chunk;
			return callback();
		}

		const next = (err, data) => {
			if (err) return callback(err);

			this._reduction = data;

			return callback();
		};

		try {
			const fnResult = fn.call(this, this._reduction, chunk, this._index++);

			// process as async function
			if (fnResult && fnResult.then) {
				return fnResult
					.then((result) => next(null, result))
					.catch((err) => next(err));
			}

			return next(null, fnResult);
		} catch (err) {
			return callback(err);
		}
	};

	const flushFn = function flushFunction(callback) {
		this.push(this._reduction);
		callback();
	};

	const Reduce = through2.ctor(options, transformFn, flushFn);

	Reduce.prototype._index = 0;
	Reduce.prototype._reduction = initial;

	return Reduce().on('finish', function() {
		// emit end event to handling via promise
		this.emit('end', this._reduction);
	});
}

export function isStream(stream) {
	return stream !== null &&
		typeof stream === 'object' &&
		typeof stream.pipe === 'function';
}

class StreamCombiner extends PassThrough {
	constructor(streams) {
		super();
		this.streams = streams;

		// When a source stream is piped to us, undo that pipe, and save
		// off the source stream piped into our internally managed streams.
		this.on('pipe', (source) => {
			source.unpipe(this);
			for (let stream of this.streams) {
				source = source.pipe(stream);
			}
			this.transformStream = source;
		});
	}

	// When we're piped to another stream, instead pipe our internal
	// transform stream to that destination.
	pipe(dest, options) {
		return this.transformStream.pipe(
			dest,
			options
		);
	}
}
