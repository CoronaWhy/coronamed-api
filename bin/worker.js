// entry point for app workers

const path = require('path');
const SCRIPT_PATH = path.resolve('./app_worker', process.argv[2]);

require('@babel/register');

const worker = require(SCRIPT_PATH).default;
const log = worker.log;

worker.once('complete', (result) => log.info(result));
