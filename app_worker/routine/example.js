import Worker from 'lib/worker';
import 'lib/mongoose'; // connect to db

const WORKER_NAME = 'routine-example';
const WORKER_DO_INTERVAL = parseInt(process.env.WORKER_ROUTINE_EXAMPLE_INTERVAL) || 300 * 1000;

const worker = new Worker(module, {
	doWork,
	name: WORKER_NAME,
	doInterval: WORKER_DO_INTERVAL,
	runImmediately: true,
	logSilentZeroResult: true
	// disabled: true
});

export default worker;

async function doWork() {
	// do useful stuff
	this.log.info('works...');
}

