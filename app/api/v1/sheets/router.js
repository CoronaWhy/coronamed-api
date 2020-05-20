import Router from 'koa-router';

import { ensureResourceById } from './middlewares';
import * as sheets from './sheets.controller';

const router = new Router({ prefix: '/sheets' });

router
	.param('id', ensureResourceById)

	.get('/', sheets.search)
	.get('/:id', sheets.getById)
	.get('/:id/export/csv', sheets.exportCSV)
	.get('/:id/rows', sheets.getSheetRows)
	.patch('/:id/rows/plain', sheets.insertRowsByPlainText)
	.put('/:id/rows/plain', sheets.replaceRowsByPlainText)
	.delete('/:id', sheets.deleteById)
;

export default router;
