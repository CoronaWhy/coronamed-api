import _isPlainObject from 'lodash/isPlainObject';

export function dotMap(obj, defPrefix='') {
	const result = {};

	if (_isPlainObject(obj)) {
		map(obj, defPrefix);
	}

	return result;

	function map(obj, prefix = '') {
		Object.keys(obj).forEach(fieldName => {
			const value = obj[fieldName];
			const path = `${prefix}${fieldName}`;

			if (_isPlainObject(value)) {
				return map(value, `${path}.`);
			} else {
				result[path] = value;
			}
		});
	}
}
