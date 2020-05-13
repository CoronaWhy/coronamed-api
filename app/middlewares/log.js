import config from 'config';

const HTTP_LOG_LEVEL = config.httpServer.logLevel;

/**
 * Return middleware that attachs logger to context and
 * logs HTTP request/response.
 *
 * @param {Object}    options={}     Optional configuration.
 * @param {Object}    options.logger Logger instance of bunyan.
 * @return {Function} Koa middleware.
 */
export default function({ logger } = {}) {
	if (!logger) {
		throw new TypeError('options.logger required');
	}

	return async function logMiddleware(ctx, next) {
		ctx.log = logRequest.bind(null, ctx);
		ctx.info = reqSerializer.bind(null, ctx);

		const req = reqSerializer(ctx);
		const reqEvent = { event: 'request', req };

		ctx.log(HTTP_LOG_LEVEL, '<-- %s', req.ip, reqEvent);

		try {
			await next();
		} catch (err) {
			throw err;
		}

		const res = resSerializer(ctx);
		const resEvent = { event: 'response', res };

		ctx.log(HTTP_LOG_LEVEL, '--> %s', req.ip, resEvent);
	};

	function logRequest(ctx, level, ...args) {
		if (typeof logger[level] !== 'function') {
			throw new Error('Unknown level: ' + level);
		}

		const protocol = ctx.request.protocol.toUpperCase();
		const method = ctx.request.method.toUpperCase();

		let pattern = `[%s:%s] [%s] [%s]`;

		if (typeof args[0] === 'string') {
			// use first arguemnt as part of pattern
			pattern += `: ${args[0]}`;
			args.shift();
		}

		const logArgs = [
			pattern,
			protocol, method, ctx.requestId, ctx.originalUrl,
			...args
		];

		logger[level](...logArgs);
	}
}

function reqSerializer(ctx) {
	const req = ctx.request;

	return {
		method: req.method,
		path: req.path,
		url: req.url,
		requestId: ctx.requestId,
		ip: ctx.realIp || req.ips[0] || req.ip,
		headers: req.headers,
		protocol: req.protocol,
		query: req.query
	};
}

function resSerializer(ctx) {
	const res = ctx.response;

	return {
		requestId: ctx.requestId,
		statusCode: res.status,
		type: res.type,
		headers: res.headers,
		body: resBodySerializer(ctx)
	};
}

function resBodyType(body) {
	if (isStream(body)) {
		return 'stream';
	} else if (isBuffer(body)) {
		return `buffer`;
	}

	return typeof body;
}

function resBodySerializer(ctx) {
	const { payload, body, messages: errors } = ctx;
	const { code, ms } = payload || {};

	const type = resBodyType(body);

	return { code, ms, type, errors };
}

function isStream(stream) {
	return stream !== null &&
		typeof stream === 'object' &&
		typeof stream.pipe === 'function';
}

function isBuffer(buffer) {
	return Buffer.isBuffer(buffer);
}
