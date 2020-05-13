import Auth from 'mw-authentication';
import { ROLE_ADMIN } from 'constants/user-roles';

export const AUTH_USER = getInterface('User');

// Simple wrap function to build static interface
function getInterface(modelName) {
	const authService = new Auth(modelName);

	Object.assign(authService, {
		TRY: authService.tryAuthorize('jwt'),
		JWT: authService.authorize('jwt'),
		API_KEY: authService.authorize('apikey'),
		COOKIE: authService.authorize('cookie'),
		ADMIN: authService.requireRoles([ROLE_ADMIN]),
		REQUIRED: checkUserAccount
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
