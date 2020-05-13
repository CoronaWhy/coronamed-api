import Promise from 'bluebird';
import EventEmitter from 'events';
import _isFunction from 'lodash/isFunction';

export default function(config) {
	const result = new Queue(config);
	return result;
}

/**
 * A queue for calling functions with concurrency and cooldown feature
 * good for third party api calling
 */
class Queue extends EventEmitter {
	constructor({ concurrency = 10, cooldown = 0 } = {}) {
		super();
		this.concurrency = concurrency;
		this.cooldown = cooldown;
		this.noCompleted = 0;
		this.noErrors = 0;
		this._running = [];
		this._staging = [];
		this._enqueued = [];
		this.earliestExecution = Date.now();
	}

	get executionDelay() {
		const now = Date.now();

		if (this.earliestExecution < now) {
			this.earliestExecution = now;
		}

		this.earliestExecution += this.cooldown;
		return this.earliestExecution - now;
	}

	get pendingAmount() {
		return this._enqueued.length;
	}

	get runningAmount() {
		return this._running.length;
	}

	get stagingAmount() {
		return this._staging.length;
	}

	get isReadyToPop() {
		return (this._running.length + this._staging.length) < this.concurrency && this._enqueued.length > 0;
	}

	get isAllDone() {
		return (this._running.length === 0 && this._staging.length === 0 && this._enqueued.length === 0);
	}

	pop() {
		if (this.isReadyToPop) {
			const fx = this._enqueued.shift();
			this._staging.push(fx);

			delay(this.executionDelay)
				.then(() => {
					this._staging.splice(this._staging.indexOf(fx), 1);
					this._running.push(fx);
				})
				.then(() => {
					let result;

					try {
						result = fx();
					} catch (e) {
						this.noErrors += 1;
					}

					return Promise.resolve(result);
				})
				.catch((err) => {
					this.noErrors += 1;
					return Promise.resolve(err);
				})
				.then(() => {
					this._running.splice(this._running.indexOf(fx), 1);
					this.noCompleted += 1;
				})
				.then(this.pop.bind(this));
		} else if (this.isAllDone) {
			this.emit('idle', this.noCompleted, this.noErrors);
		}
	}

	push(fx) {
		if (!_isFunction(fx)) {
			throw new Error('Push only functions that returns promises to the queue.');
		}

		const q = defer();
		const fnWrap = () => {
			if (_isFunction(fx.then)) {
				return fx.then(q.resolve).catch(q.reject);
			} else {
				try {
					const result = fx();

					if (_isFunction(result.then)) {
						return result.then(q.resolve).catch(q.reject);
					}

					q.resolve(result);
					return result;
				} catch (err) {
					q.reject(err);
					throw err;
				}
			}
		};

		this._enqueued.push(fnWrap);
		this.pop();

		return q.promise;
	}
}

function delay(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function defer() {
	let resolve, reject;

	const promise = new Promise(function() {
		resolve = arguments[0];
		reject = arguments[1];
	});

	return {
		resolve: resolve,
		reject: reject,
		promise: promise
	};
}
