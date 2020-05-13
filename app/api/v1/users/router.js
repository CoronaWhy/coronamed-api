import Router from 'koa-router';

import { AUTH_USER } from 'middlewares/auth';
import { unAuthOrAnon } from './middlewares';
import * as users from './users.controller';

const router = new Router({ prefix: '/users' });

router
	.post('/signup', AUTH_USER.TRY, unAuthOrAnon, users.signup)
	.post('/login/apikey', AUTH_USER.API_KEY, users.loginByApiKey)
	.post('/login/email', users.loginByEmail)

	.post('/password/reset', users.resetPassword)
	.post('/password/forgot', users.sendResetEmail)

	.use(AUTH_USER.JWT)
	.get('/me', users.getMe)
	.put('/me', users.updateMe)
;

export default router;
