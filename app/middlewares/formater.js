import JSONStream from 'JSONStream';
import { isStream } from 'utils/stream';

/**
 * Return middleware that standardizate response
 * Success: {"data": ..., "status": 200, "ms": 2}
 * Error:   {
 *     "code": err_code,
 *     "error": true,
 *     "status": http_status,
 *     "message": err_message,
 *     "messages": err_messages
 * }
 *
 * Notice: you can use "ctx.payload" for mixing in root of body result
 * Warning: don't put large object to "ctx.payload" when return stream
 * will be spend long time for serialization through JSON.stringify
 *
 * @param {Object}    options={}        Optional configuration.
 * @param {String}    options.resultKey Response controller result key
 * @return {Function} Koa middleware.
 */
export default function(options = {}) {
	if (!options.resultKey) {
		throw new TypeError('options.resultKey required');
	}

	return formaterMiddleware.bind(null, options);
}

async function formaterMiddleware({ resultKey }, ctx, next) {
	const startAt = Date.now();

	ctx.payload = {};

	await next();

	ctx.payload.ms = Date.now() - startAt;
	ctx.payload.status = ctx.status;

	// use native koa response handler
	if (ctx.rawBody && !ctx.payload.error) {
		return;
	}

	if (isStream(ctx.body)) {
		// json stream
		const payloadPart = JSON.stringify(ctx.payload).slice(0, -1);
		const source = ctx.body;

		const stream = ctx.body = JSONStream.stringify(
			`${payloadPart}, "${resultKey}": [`,
			', ',
			']}'
		);

		ctx.type = 'json';
		source.pipe(stream);
	} else if (!Buffer.isBuffer(ctx.body)) {
		// simple json response
		const data = ctx.body;
		ctx.body = Object.assign({ [resultKey]: data }, ctx.payload);
	}
}
