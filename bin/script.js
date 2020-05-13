// entry point for app scripts

const path = require('path');
const SCRIPT_PATH = path.resolve('./app_console', process.argv[2]);

require('@babel/register');

const script = require(SCRIPT_PATH).default;
const log = script.log;
const argv = process.argv.slice(2);

script.once('complete', (result) => log.info(result));
script.run({ argv });
