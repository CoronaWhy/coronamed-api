// npm run console -- export-members

import _get from 'lodash/get';
import _camelCase from 'lodash/camelCase';
import * as csv from '@fast-csv/parse';

import Script from 'lib/script';
import mongoose from 'lib/mongoose';
import gmaps from 'lib/gmaps-client';

const DB_CORD19 = mongoose.__openConnection('cord19');

const script = new Script(module, {
	doWork,
	argvParams: {
		default: {
			f: ''
		}
	}
});

script.on('complete', () => mongoose.disconnect());

export default script;

async function doWork(params) {
	// export data
	const items = await new Promise((resolve, reject) => {
		const result = [];

		csv.parseFile(params.f, { headers: true, trim: true, ignoreEmpty: true })
			.on('error', reject)
			.on('data', data => {
				const item = {};

				for(let key in data) {
					if (!key) continue;

					let validKey = _camelCase(key);
					item[validKey] = data[key];
				}

				result.push(item);
			})
			.on('end', () => resolve(result));
	});

	let amount = 0;
	let skip = 0;

	// attach geo city & save
	for (let item of items) {
		const writeToDB = async(lat, lng) => {
			item.geoCity = {
				type: 'Point',
				coordinates: [lat, lng]
			};

			script.log.info('[writeToDB] uniqueKey: %j', item.uniqueKey);
			amount++;

			await DB_CORD19.collection('members').findOneAndUpdate({
				uniqueKey: item.uniqueKey
			}, { $set: item }, { upsert: true });
		};

		if (!item.uniqueKey) {
			script.log.warn('has missed uniqueKey: %j', item);
			skip++;
			continue;
		}

		if (!item.city) {
			await writeToDB(0, 0);
			continue;
		}

		const geoResults = await gmaps.geocode({
			address: item.city,
			region: 'US'
		}).asPromise().then(r => _get(r, 'json.results'));

		const location = _get(geoResults, '0.geometry.location');

		if (location) {
			await writeToDB(location.lng, location.lat);
		} else {
			await writeToDB(0, 0);
		}
	}

	return { amount, skip};
}
