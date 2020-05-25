const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '::';

const APP_NAME            = process.env.APP_NAME || 'coronamed-api';
const APP_SECRET          = process.env.APP_SECRET || 'app-secret-key';
const APP_PUBLIC_ENDPOINT = process.env.APP_PUBLIC_ENDPOINT || `http://localhost:${PORT}`;

const HTTP_LOG_LEVEL = process.env.HTTP_LOG_LEVEL || 'info';

const NODE_ENV = process.env.NODE_ENV || 'development';

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_PATH  = process.env.LOG_PATH || path.resolve('logs');

const JWT_SECRET = process.env.JWT_SECRET || 'app-secret-token-key';

module.exports = {
	app: {
		name: APP_NAME,
		endpoint: APP_PUBLIC_ENDPOINT,
		secret: APP_SECRET
	},
	httpServer: {
		host: HOST,
		port: PORT,
		logLevel: HTTP_LOG_LEVEL
	},
	mongo: {
		// multiple db connections
		db: {
			main: {
				hosts: [process.env.MONGODB_URI || `mongodb://localhost/${APP_NAME}-${NODE_ENV}`],
				options: {}
			},
			cord19: {
				hosts: [process.env.MONGODB_CORD19_URI || `mongodb://localhost/${APP_NAME}-cord19-${NODE_ENV}`]
			}
		},
		// default options
		options: {
			autoReconnect: true,
			autoIndex: process.env.MONGOOSE_AUTO_INDEX !== 'false',
			reconnectTries: Number.MAX_VALUE,
			reconnectInterval: 500,
			poolSize: 20,
			bufferMaxEntries: 0
		},
		debug: process.env.MONGOOSE_DEBUG === 'true' || false,
		reconnectTimeout: 5000
	},
	jwt: {
		secret: JWT_SECRET,
		algorithm: 'HS256',
		expiresIn: 60 * 60 * 24 * 30 // 30 days in seconds
	},
	logger: {
		level: LOG_LEVEL,
		dir: LOG_PATH,
		splitFiles: ['warning', 'error'],
		dailyRotate: {
			datePattern: 'YYYY-MM-DD-HH',
			zippedArchive: true,
			maxSize: '20m',
			maxFiles: '14d'
		}
	},
	email: {
		subject: '__PROJECT_NAME__',
		from: process.env.EMAIL_DEFAULT_FROM || 'noreply@project-name.co'
	},
	mandrill: {
		apikey: process.env.MANDRILL_API_KEY || '__none__'
	},
	google: {
		apikey: process.env.GOOGLE_API_KEY
	}
};
