/**
 * Round a number to digits
 * @param  {Number} value
 * @param  {Number} digits
 * @return {Number}
 */
export function round2digits(value, digits = 2) {
	return Number(Math.round(value + 'e' + digits) + 'e-' + digits);
}

/**
 * Get percent of value
 * @param  {Number}   value
 * @param  {Number}   percent
 * @param  [{Number}] digits
 * @return {Number}
 */
export function percentOf(value, percent, digits) {
	let result = (percent / 100) * value;

	if (digits) {
		result = round2digits(result, digits);
	}

	return result;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
