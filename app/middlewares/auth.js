import _get from 'lodash/get';
import compose from 'koa-compose';
import Auth from 'mw-authentication';

import ApiError from 'errors/ApiError';

export const AUTH_USER = getInterface('User');

// Simple wrap function to build static interface
function getInterface(modelName) {
	const authService = new Auth(modelName);

	const checkAccountDisabledFlag = (ctx, next) => {
		const isDisabled = !!_get(ctx._user, 'disabled');

		if (isDisabled) {
			throw new ApiError('UNAUTHORIZED', `Unauthorized, account disabled.`);
		}

		return next();
	};

	const checkAccountType = (ctx, next) => {
		const accountType = _get(ctx._user, 'constructor.modelName', null);

		if (!accountType) {
			throw new ApiError('FORBIDDEN');
		} else if (accountType !== modelName) {
			throw new ApiError('FORBIDDEN', `Forbidden, cannot access resource by ${accountType} account.`);
		}

		return next();
	};

	Object.assign(authService, {
		TRY: authService.tryAuthorize('jwt'),
		JWT: compose([authService.authorize('jwt'), checkAccountType, checkAccountDisabledFlag]),
		API_KEY: compose([authService.authorize('apikey'), checkAccountType, checkAccountDisabledFlag]),
		COOKIE: compose([authService.authorize('cookie') , checkAccountType, checkAccountDisabledFlag]),
		ADMIN: compose([authService.requireRoles(['ROLE_ADMIN']), checkAccountType, checkAccountDisabledFlag]),
		STAFF: compose([authService.requireRoles(['ROLE_ADMIN']), checkAccountType, checkAccountDisabledFlag]),
		REQUIRED: checkUserAccount,
		ROLES(list) {
			return compose([authService.requireRoles(list), checkAccountType, checkAccountDisabledFlag]);
		}
	});

	return authService;
}

/**
 * Check authorized user exist
 */
function checkUserAccount(ctx, next) {
	if (!ctx._user) ctx.throw(401);
	return next();
}
