import path from 'path';
import glob from 'glob';

const SCHEMA_PATH = path.resolve('app_worker', 'routine', '*.js');
let modules = [];

if (!process.env.ROUTINE_ENABLED && process.env.NODE_ENV === 'development') {
	process.env.ROUTINE_ENABLED = 'false';
	console.warn('|-----------------------------------------------------|');
	console.warn('| WARNING! Routine workers disabled while development.|');
	console.warn('| [ROUTINE_ENABLED=true] to enable workers.           |');
	console.warn('|-----------------------------------------------------|');
}

if (process.env.ROUTINE_ENABLED !== 'false') {
	modules = glob.sync(SCHEMA_PATH)
		.filter(v => v !== 'index.js')
		.map(require);
}

export default (() => {
	const result = {};

	modules.forEach(worker => {
		result[worker.filename] = worker;
	});

	return result;
});
