export default function mongooseMerge(source, dest) {
	Object.keys(dest).forEach(key => {
		const newValue = dest[key];

		if (Array.isArray(newValue)) {
			if (typeof source[key] === 'object' && source[key].addToSet) {
				source[key].addToSet(...newValue);
			} else {
				set(key, newValue);
			}
		} else if (isValidObject(newValue)) {
			mongooseMerge(source[key], newValue);
		} else {
			set(key, newValue);
		}
	});

	function set(key, value) {
		if (source.set) {
			source.set(key, value);
		} else {
			source[key] = value;
		}
	}

	return source;
}

function isValidObject(obj) {
	return obj !== null &&
		typeof obj === 'object' &&
		!(obj instanceof Date) &&
		obj.constructor.name !== 'ObjectID';
}
