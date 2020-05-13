import Router from 'koa-router';

import admin from './admin/router';
import users from './users/router';
import sheets from './sheets/router';

const instance = new Router();

export default instance
	.use(admin.routes())
	.use(users.routes())
	.use(sheets.routes())
;
