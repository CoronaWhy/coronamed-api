const DEF_STR_ASSIGN_REGEXP = /\{{([A-z-_. ]*)\}}/g;
const DEF_STR_ASSIGN_METHOD = (obj, key) => obj[key];

/**
 * Escape string to regexp pattern
 * @param  {String} str String source
 * @return {String}     Resulted pattern
 */
export function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'); // eslint-disable-line
}

/**
 * A util function for assign string with object
 * @param  {String} str Source pattern string
 * @param  {Object} obj Assign object
 * @return {String}
 */
export function strAssign(str, obj, method = DEF_STR_ASSIGN_METHOD) {
	return str.replace(DEF_STR_ASSIGN_REGEXP, (match, p1) => {
		const key = p1.trim();
		const value = method(obj, key);

		if (value === undefined || value === null) {
			return match;
		}

		return value;
	});
}

/**
 * Parsing sort expression for mongodb query
 * @param  {String} str Source
 * @return {Object}
 */
export function parseSortExpression(str) {
	const parts = str.trim().replace(/ /g, '').split(',');
	const props = parts
		.map(parseLine)
		.filter(v => !!v);

	const result = {};

	props.forEach(({ key, direction }) => {
		result[key] = direction;
	});

	return result;

	function parseLine(line) {
		let [key, strDirection] = line.split(':');
		let direction = -1;

		if (!key || !key.length) {
			return null;
		}

		if (!strDirection || !strDirection.length) {
			return { key, direction };
		}

		const directionNumber = parseInt(strDirection);
		strDirection = strDirection.toLowerCase();

		if (!isNaN(directionNumber)) {
			direction = directionNumber > 0 ? 1 : -1;
		} else if (strDirection === 'asc') {
			direction = 1;
		} else if (strDirection === 'desc') {
			direction = -1;
		}

		return { key, direction };
	}
}

export function parseList(str, separator = ',') {
	if (typeof str !== 'string') {
		return null;
	}

	return str.split(separator);
}

export function escapeNumeric(str) {
	const result =  String(str).replace(/\D/g, '');

	if (!result.length) {
		return undefined;
	}

	return result;
}
