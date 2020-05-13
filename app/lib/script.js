import EventEmitter from 'events';
import path from 'path';

import minimist from 'minimist';
import logger from './logger';

class Script extends EventEmitter {
	constructor(module, { name, doWork, argvParams }) {
		super();

		this.name = name || 'unknown';
		this.inProgress = false;
		this.doWork = doWork;
		this.argvParams = argvParams;
		this.log = logger(module, name);
		this.filename = path.basename(module.filename, '.js');

		this.on('error', this.onError.bind(this));
		this.log.debug({ event: 'initialized' });
	}

	run({ argv = [], params = {} } = {}) {
		if (this.inProgress) {
			this.log.debug({ event: 'cooldown', reason: 'still in process'});
			return;
		}

		const parsedArguments =  minimist(argv, this.argvParams);
		params = Object.assign(params, parsedArguments);

		this.inProgress = true;

		this.log.debug({ event: 'run', params });
		this.emit('run');

		return this.doWork(params).then((result) => {
			this.inProgress = false;
			this.emit('script:complete', result);
			this.log.debug({ event: 'complete', result });

			return { success: true, result };
		}).catch(err => {
			this.inProgress = false;
			this.emit('script:error', err);
			this.onError(err);

			return { success: false, error: err };
		}).then(result => {
			this.emit('complete', result);
			return result;
		});
	}

	onError(err) {
		this.log.debug({ err, event: 'error' });
	}
}

export default Script;
