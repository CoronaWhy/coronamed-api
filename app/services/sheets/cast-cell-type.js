import url from 'url';
import moment from 'moment';
import mongoose from 'lib/mongoose';

const DB_CORD19 = mongoose.__openConnection('cord19');

const TYPE_MAP_PARSER = {
	'cord_ref': parseCordRef,
	'url': parseUrl,
	'date': parseDate,
	'number': parseNumber
};

export default async function castCellType(strValue) {
	if (typeof strValue !== 'string') {
		strValue = String(strValue);
	}

	for(let type in TYPE_MAP_PARSER) {
		const parserFn = TYPE_MAP_PARSER[type];

		try {
			const result = await parserFn(strValue);

			if (result !== null) {
				return { v: result, t: type };
			}
		} catch (error) {
			console.warn('throw error while parsing', { strValue, type, error });
		}
	}

	return {
		v: strValue,
		t: 'string'
	};
}

async function parseCordRef(strValue) {
	const parsedUrl = url.parse(strValue);

	if (
		!parsedUrl.protocol ||
		!parsedUrl.pathname ||
		typeof parsedUrl.pathname !== 'string'
	) {
		return null;
	}

	let pathname = parsedUrl.pathname.toLowerCase();

	if (pathname[0] === '/') {
		pathname = pathname.substr(1);
	}

	if (!pathname) {
		return null;
	}

	const refDoc = await DB_CORD19.collection('v19').findOne({ doi: pathname });

	if (refDoc) {
		return refDoc['cord_uid'];
	}

	return null;
}

function parseUrl(strValue) {
	const parsedUrl = url.parse(strValue);

	if (
		parsedUrl.protocol !== 'http:' &&
		parsedUrl.protocol !== 'https:'
	) {
		return null;
	}

	return strValue;
}

function parseDate(strValue) {
	if (!/-|\//.test(strValue)) {
		return null;
	}

	const dt = moment.utc(strValue);

	if (dt.isValid()) {
		return dt.toDate();
	}

	return null;
}

function parseNumber(v) {
	v = String(v)
		.replace(/,/g, '.')
		.trim();

	const numStr = v.replace(/[^0-9.]/g, '');

	if (numStr.length < v.length) {
		return null;
	}

	const result = parseFloat(v);

	if (isNaN(result) || !isFinite(result)) {
		return null;
	}

	return result;
}
