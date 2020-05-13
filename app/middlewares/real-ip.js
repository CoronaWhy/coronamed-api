export default function realIp(options = {}) {
	const {
		header = 'x-forwarded-for',
		fieldName = 'realIp'
	} = options;

	return (ctx, next) => {
		let result = ctx.request.get(header);

		if (result) {
			result = result.split(',').pop();
		} else {
			result = ctx.request.ip;
		}

		ctx[fieldName] = result;

		return next();
	};
}

