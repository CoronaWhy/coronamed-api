import Router from 'koa-router';
import { AUTH_USER } from 'middlewares/auth';

import users from './users/router';
import * as admin from './admin.controller';
import * as variables from './variables.controller';

const router = new Router({ prefix: '/admin' });

router
	.use(AUTH_USER.JWT, AUTH_USER.ADMIN)
	.use('/users', users.routes())

	.get('/variables', variables.getVariables)
	.get('/variables/:keyName', variables.getVariableByKey)
	.put('/variables/:keyName', variables.updateVariableByKey)

	.get('/log/events', admin.searchLogEvents)
;

export default router;
