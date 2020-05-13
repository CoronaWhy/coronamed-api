import _get from 'lodash/get';
import _isPlainObject from 'lodash/isPlainObject';
import mongoose from 'mongoose';

const DEF_SECTION = 'common';
const DEF_TTL = 60 * 60 * 24 * 30; // 30 days

const Schema = new mongoose.Schema({
	section:  { type: String, index: true },
	name:     { type: String, index: true },
	msg:      { type: String },
	metadata: { type: Object },
	date:     { type: Date, default: Date.now },
	ttl:      { type: Date, expires: 1 }
}, {
	collection: 'event_trackers',
	minimize: false,
	versionKey: false
});

Schema.index({ section: 1, name: 1, date: -1 });
Schema.index({ section: 1, date: -1 });
Schema.index({ date: -1 });

/**
 * Wrap of write function with context
 *
 * @param      {Object}      [params={}]                   The params
 * @param      {String}      [paramssection=DEF_SECTION]   The section of event
 * @param      {Date|Number} [params.ttl=DEF_TTL]          The time-to-live of event
 * @return     {Object}                                    EventContext interface
 */
Schema.statics.context = function contextEventTracker({
	section = DEF_SECTION,
	ttl = DEF_TTL
} = {}) {
	return {
		section,
		ttl,
		write: ({ name, msg, metadata }) => {
			return this.write(section, name, msg, metadata, ttl);
		}
	};
};

/**
 * Write service event document
 *
 * @param      {String}      [section=DEF_SECTION]  The section of event
 * @param      {String}      name                   The name of event
 * @param      {String}      msg                    The message of event
 * @param      {Object}      metadata               The metadata
 * @param      {Date|Number} [ttl=DEF_TTL]          The time-to-live
 * @return     {Promise}
 */
Schema.statics.write = function writeEventTracker(
	section = DEF_SECTION,
	name,
	msg,
	metadata,
	ttl = DEF_TTL
) {
	if (typeof ttl === 'number') {
		const date = new Date();
		date.setSeconds(date.getSeconds() + ttl);
		ttl = date;
	}

	if (typeof msg === 'object') {
		metadata = msg;
		msg = null;
	}

	metadata = safeObjectKeys(metadata);

	const data = { section, name, msg, metadata, ttl };

	return this.insertMany([data]).catch(err => {
		console.error('event-tracker write error:', err);
	});
};

const EventTracker = mongoose.model('EventTracker', Schema);
export default EventTracker;

function safeObjectKeys(obj) {
	if (!_isPlainObject(obj)) {
		return obj;
	}

	const result = {};

	Object.keys(obj).forEach(key => {
		const safeKey = key.replace(/\./g, '');
		let value = obj[key];

		if (_get(value, 'toObject') === 'function') {
			value = value.toObject();
		}

		if (_isPlainObject(value)) {
			result[safeKey] = safeObjectKeys(value);
		} else {
			result[safeKey] = value;
		}
	});

	return result;
}
