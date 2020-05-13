import Promise from 'bluebird';
import mongoose from 'mongoose';

const Mixed = mongoose.Schema.Types.Mixed;

const WAIT_KEY = '~wait';
const MAX_WAIT = 5;

const Schema = new mongoose.Schema({
	_id:   { type: String },
	value: { type: Mixed },
	ttl:   { type: Date, expires: 1 }
}, {
	collection: 'cached_items',
	minimize: false,
	versionKey: false
});

/**
 * Get cached value by key
 *
 * @param      {String}  key       The key
 * @param      {Mixed}  defValue   The definition value
 * @return     {Mixed}
 */
Schema.statics.get = async function get(key, defValue) {
	const obj = await CachedItem.findById(key).lean();

	if (obj && obj.value !== undefined) {
		return obj.value;
	}

	return defValue;
};

/**
 * Set & overwrite cached value by key
 *
 * @param      {<type>}  key            The new value
 * @param      {<type>}  value          The value
 * @param      {Date}    ttl            The time-to-live
 */
Schema.statics.set = function set(key, value, ttl, failScore = 0) {
	const opts = { upsert: true, new: true };

	if (typeof ttl === 'number') {
		const date = new Date();
		date.setSeconds(date.getSeconds() + ttl);
		ttl = date;
	}

	return CachedItem.findOneAndUpdate({ _id: key }, { value, ttl }, opts)
		.catch(async err => {
			if (err.codeName === 'DuplicateKey' && failScore < 5) {
				await Promise.delay(100);
				return CachedItem.set(key, value, ttl, ++failScore);
			}

			throw err;
		});
};

/**
 * The function to get cached value if exists or renew by refresher function
 *
 * @param      {Object}    params
 * @param      {<type>}    params.key        The key of chached value
 * @param      {<type>}    params.ttl        The time-to-live of cache
 * @param      {Function}  params.refresher  The refresher function
 * @return     {Mixed}    The cached value
 */
Schema.statics.provide = async function provideCache({ key, ttl, refresher }, waitScore = 0) {
	// Disable cache for development
	if (process.env.NODE_ENV === 'development') {
		return refresher();
	}

	if (!key) key = `~rand:${Math.random()}`;

	const cached = await CachedItem.get(key);

	if (cached === WAIT_KEY && waitScore < MAX_WAIT) {
		await Promise.delay(1000);
		return Schema.statics.provide({ key, ttl, refresher }, ++waitScore);
	}

	if (cached && cached !== WAIT_KEY) {
		return cached;
	}

	await CachedItem.set(key, WAIT_KEY, 30);
	const fresh = await refresher();
	await CachedItem.set(key, fresh, ttl);

	return fresh;
};

const CachedItem = mongoose.model('CachedItem', Schema);
export default CachedItem;
