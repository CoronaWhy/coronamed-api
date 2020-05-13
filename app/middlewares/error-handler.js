import { HttpError } from 'http-errors';
import { UNKNOWN_ERROR } from 'constants/api-errors';

import ApiError from 'errors/ApiError';

const NODE_ENV = process.env.NODE_ENV || 'development';

const MAP_HTTP_STATUS_TO_API_CODE = {
	100: 'CONTINUE',
	200: 'OK',
	201: 'CREATED',
	202: 'ACCEPTED',
	204: 'NO_CONTENT',
	400: 'BAD_REQUEST',
	401: 'UNAUTHORIZED',
	403: 'FORBIDDEN',
	404: 'NOT_FOUND',
	408: 'REQUEST_TIMEOUT',
	422: 'UNPROCESSABLE_ENTITY',
	500: 'INTERNAL_SERVER_ERROR',
	501: 'NOT_IMPLEMENTED',
	502: 'BAD_GATEWAY',
	503: 'SERVICE_UNAVAILABLE',
	504: 'GATEWAY_TIME_OUT'
};

/**
 * Return middleware that handle exceptions in Koa.
 * Dispose to the first middleware.
 *
 * @return {Function}
 */
export default function() {
	return errorHandlerMiddleware;
}

async function errorHandlerMiddleware(ctx, next) {
	try {
		await next();

		// Respond 404 Not Found for unhandled request
		if (!ctx.body && (!ctx.status || ctx.status === 404)) {
			throw 'UNKNOWN_ENDPOINT';
		}
	} catch (err) {
		const { errMsgs, errCode, errStatus, handled } = errorHandler(err);

		if (!handled) {
			ctx.app.emit('error', err, ctx);
		}

		ctx.status = errStatus || UNKNOWN_ERROR.status;
		ctx.payload.code = errCode;
		ctx.payload.error = true;
		ctx.payload.message = errMsgs[0];
		ctx.payload.messages = errMsgs;
	}
}

function errorHandler(err) {
	let errMsgs = [UNKNOWN_ERROR.message];
	let errCode  = UNKNOWN_ERROR.code;
	let errStatus  = UNKNOWN_ERROR.status;

	let handled = true;

	// transofrm different errors to api error
	switch (true) {
		// do nothing
		case err instanceof ApiError:
			break;

		case typeof err === 'string':
			err = new ApiError(err);
			break;

		case err instanceof HttpError:
			err = new ApiError('UNKNOWN_ERROR', err.message, err.statusCode);
			err.code = MAP_HTTP_STATUS_TO_API_CODE[err.statusCode] || err.code;
			break;

		case err.jwtErrName === 'JsonWebTokenError':
			err = new ApiError('TOKEN_VALIDATION_ERROR', err.message);
			break;

		case err.jwtErrName === 'TokenExpiredError':
			err = new ApiError('TOKEN_EXPIRED_ERROR', err.message);
			break;

		case err.name === 'AppError':
			err = new ApiError('UNKNOWN_ERROR', err.message, err.code);
			err.code = MAP_HTTP_STATUS_TO_API_CODE[err.statusCode] || err.code;
			break;

		case err.name === 'ValidationError':
			err = new ApiError('BAD_REQUEST', extractMongooseErrorMessages(err));
			break;

		// show internal error just for development
		case NODE_ENV === 'development':
			err = new ApiError('UNKNOWN_ERROR', `[HIDDEN_ON_PROD]: ${err.message}`);
			handled = false;
			break;
	}

	// Handling error
	if (err.name === 'ApiError') {
		errMsgs = err.messages;
		errCode = err.code;
		errStatus = err.statusCode;
	} else {
		handled = false;
	}

	return { errMsgs, errCode, errStatus, handled };
}

function extractMongooseErrorMessages(err) {
	return Object.keys(err.errors)
		.map(key => `${err.errors[key].message}`);
}
