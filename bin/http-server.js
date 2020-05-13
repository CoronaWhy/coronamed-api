const path = require('path');
const SCRIPT_PATH = path.resolve('./app', 'http-server.js');

require('@babel/register');
require(SCRIPT_PATH);
