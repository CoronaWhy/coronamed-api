import Router from 'koa-router';

import { AUTH_USER } from 'middlewares/auth';
import { ensureResourceById } from './middlewares';
import * as sheets from './sheets.controller';

const router = new Router({ prefix: '/sheets' });

const AUTH_EDIT_ACCESS = AUTH_USER.ROLES(['ROLE_ADMIN', 'ROLE_SHEET_EDIT']);

router
	.param('id', ensureResourceById)

	.get(   '/',                sheets.search) // eslint-disable-line
	.get(   '/export',          sheets.exportAll) // eslint-disable-line
	.get(   '/:id',             sheets.getById) // eslint-disable-line
	.get(   '/:id/export/csv',  sheets.exportCSV) // eslint-disable-line
	.get(   '/:id/rows',        sheets.getSheetRows) // eslint-disable-line
	.patch( '/:id/rows/plain',  AUTH_USER.JWT, AUTH_EDIT_ACCESS, sheets.insertRowsByPlainText) // eslint-disable-line
	.put(   '/:id/rows/plain',  AUTH_USER.JWT, AUTH_EDIT_ACCESS, sheets.replaceRowsByPlainText) // eslint-disable-line
	.delete('/:id',             AUTH_USER.JWT, AUTH_EDIT_ACCESS, sheets.deleteById) // eslint-disable-line
;

export default router;
