/**
 * A global api error alias for simplify throw like
 * throw 'TOKEN_EXPIRED_ERROR';
 */

export const BAD_REQUEST = {
	code: 'BAD_REQUEST',
	status: 400,
	message: 'The request has invalid parameters.'
};

export const UNAUTHORIZED = {
	code: 'UNAUTHORIZED',
	status: 401,
	message: 'The request has not been applied because it lacks valid authentication credentials for the target resource.'
};

export const TOKEN_EXPIRED_ERROR = {
	code: 'TOKEN_EXPIRED_ERROR',
	status: 401,
	message: 'Your session has expired, please login.'
};

export const TOKEN_VALIDATION_ERROR = {
	code: 'TOKEN_VALIDATION_ERROR',
	status: 401,
	message: 'Session validation error.'
};

export const FORBIDDEN = {
	code: 'FORBIDDEN',
	status: 403,
	message: 'Forbidden, cannot access resource.'
};

export const UNKNOWN_ENDPOINT = {
	code: 'UNKNOWN_ENDPOINT',
	status: 404,
	message: 'The requested endpoint does not exist.'
};

export const NOT_FOUND = {
	code: 'NOT_FOUND',
	status: 404,
	message: 'Not Found - resource doesn\'t exist.'
};

export const CONFLICT = {
	code: 'CONFLICT',
	status: 409,
	message: 'Conflict - with state of the resource on server.'
};

export const UNKNOWN_ERROR = {
	code: 'UNKNOWN_ERROR',
	status: 500,
	message: 'The server encountered an unknown internal error.'
};
