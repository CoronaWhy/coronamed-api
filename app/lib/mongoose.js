import Promise from 'bluebird';
import _get from 'lodash/get';
import _defaultsDeep from 'lodash/defaultsDeep';

import mongoose from 'mongoose';
import config from 'config';
import logger from './logger';

const log = logger(module, 'mongoose');

const IS_DEBUG_MODE          = _get(config, 'mongo.debug', false);
const DEF_CONNECTION_OPTIONS = _get(config, 'mongo.options', {});
const DEF_RECONNECT_TIMEOUT  = 3000;

const CONNECTION_MAP = {};

if (process.env.MONGOOSE_NO_TIMEOUT) {
	console.warn('MONGOOSE_NO_TIMEOUT');

	Object.assign(DEF_CONNECTION_OPTIONS, {
		connectTimeoutMS: 0,
		socketTimeoutMS: 0
	});
}

mongoose.set('debug', IS_DEBUG_MODE);
mongoose.Promise = Promise;

/**
 * Method split ids like "1,2,3" and find in db
 * @param  {Array} ids List of id
 */
mongoose.Model.findByIds = function(ids) {
	return this.find({ _id: { $in: ids } });
};

/**
 * Sugar function to check existing
 * document by criteria
 * @param  {Object} criteria serch criteria
 * @return {Boolean}
 */
mongoose.Model.exist = function(criteria) {
	return this.countDocuments(criteria).then(result => result > 0);
};

mongoose.__openConnection = openConnection;

initAllConnections();

export default mongoose;

process.on('SIGINT', function() {
	mongoose.disconnect(function() {
		log.warn('disconnected through app termination.');
		process.exit(0);
	});
});

function initAllConnections() {
	const dbList = Object.keys(_get(config, 'mongo.db', {}));

	if (dbList.indexOf('main') < 0) {
		throw new TypeError('Missed mongodb main connection config.');
	}

	return Promise.all(dbList.map(openConnection));
}

function openConnection(connectionName) {
	let uri, options, connection;

	if (CONNECTION_MAP[connectionName]) {
		return CONNECTION_MAP[connectionName];
	}

	uri =
		_get(config, `mongo.db.${connectionName}.hosts`) ||
		_get(config, `mongo.db.${connectionName}`) ||
		'';

	options = _defaultsDeep({},
		_get(config, `mongo.db.${connectionName}.options`, {}),
		DEF_CONNECTION_OPTIONS
	);

	if (Array.isArray(uri)) {
		uri = uri.join(',');
	}

	if (!uri || !uri.length) {
		throw TypeError(`missed hosts for ${connectionName} connection.`);
	} else if (!options) {
		throw TypeError(`missed options for ${connectionName} connection.`);
	}

	log.debug('connect [%s]: %s', connectionName, uri);

	if (connectionName === 'main') {
		connection = mongoose.connection;
	} else {
		connection = mongoose.createConnection();
	}

	connection.on('disconnected', onDisconnected);
	CONNECTION_MAP[connectionName] = connection;

	connect();

	return connection;

	function connect() {
		connection.openUri(uri, options)
			.then(onConnectionOpen)
			.catch(onConnectionError);
	}

	function onConnectionOpen() {
		log.info('[%s] database connected...', connectionName);
	}

	function onConnectionError(err) {
		const reconnectTimeout =
			options.reconnectTimeout ||
			DEF_RECONNECT_TIMEOUT;

		log.error('[%s] database connection error: %s', connectionName, err.message);
		log.info('[%s] database reconnect... (%dms)', connectionName, reconnectTimeout);

		setTimeout(connect, reconnectTimeout);
	}

	function onDisconnected() {
		log.warn('connection to DB disconnected.');
	}
}
