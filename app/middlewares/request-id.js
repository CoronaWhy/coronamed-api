import uuidV4 from 'uuid/v4';

/**
 * Return middleware that gets an unique request id from a header or
 * generates a new id.
 *
 * @param {Object} [options={}] - Optional       configuration.
 * @param {string} [options.header=X-Request-Id] Request and response header name.
 * @param {string} [options.fieldName=reqId] -   Context property name.
 * @param {function} [options.generator] -       Id generator function.
 * @return {function} Koa middleware.
 */
export default function requestId(options = {}) {
	const {
		header = 'X-Request-Id',
		fieldName = 'requestId',
		generator = uuidV4
	} = options;

	return (ctx, next) => {
		const id = ctx.request.get(header) || generator();

		ctx[fieldName] = id;
		ctx.set(header, id);

		return next();
	};
}
