// npm run job example

import Worker from 'lib/worker';

const WORKER_NAME = 'worker-example';
const WORKER_DO_INTERVAL = 1 * 60 * 1000; // Each 1 min

const worker = new Worker(module, {
	doWork,
	name: WORKER_NAME,
	doInterval: WORKER_DO_INTERVAL,
	runImmediately: true
});

export default worker;

async function doWork() {
	// Do some stuff here

	this.log.debug('compute random number.');
	return Math.random();
}
