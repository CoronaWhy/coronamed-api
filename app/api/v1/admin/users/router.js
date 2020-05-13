import Router from 'koa-router';
import Pagination from 'mw-pagination';

import { ensureUserById } from './middlewares';
import * as users from './users.controller';

const router = new Router();
const pagin = new Pagination();

router
	.param('user_id', ensureUserById)

	.get('/', pagin.init, users.search)
	.post('/', users.createUser)
	.get('/:user_id', users.getUser)
	.put('/:user_id', users.updateUser)
	.delete('/:user_id', users.deleteUser);

export default router;
