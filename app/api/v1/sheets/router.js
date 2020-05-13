import Router from 'koa-router';

import { ensureResourceById } from './middlewares';
import * as sheets from './sheets.controller';

const router = new Router({ prefix: '/sheets' });

router
	.param('id', ensureResourceById)

	.get('/', sheets.search)
	.get('/:id', sheets.getById)
	.patch('/:id/rows/plain', sheets.insertRowsByPlainText)
	.delete('/:id', sheets.deleteById)
;

export default router;
