import _set from 'lodash/set';
import _get from 'lodash/get';
import Promise from 'bluebird';

import * as csv from '@fast-csv/format';

import { escapeRegExp, parseSortExpression } from 'utils/str';
import { Sheet } from 'models';

export async function search(ctx) {
	const params = ctx.query;
	const criteria = {};
	let sortBy = {};

	if (params.sort) {
		sortBy = parseSortExpression(params.sort);
		delete params.sort;
	}

	if (params.q) {
		const expr = new RegExp(escapeRegExp(params.q), 'i');
		criteria.title = expr;
	}

	ctx.jsonStream = true;
	ctx.body = Sheet.find(criteria)
		.sort(sortBy)
		.select('-rows -header')
		.lean()
		.cursor();
}

export function getById(ctx) {
	ctx.body = ctx.state.sheet.toJSON({ virtuals: true });
}

export async function deleteById(ctx) {
	await ctx.state.sheet.remove();
	ctx.body = 'ok';
}

export async function exportCSV(ctx) {
	const sheet = ctx.state.sheet;
	const csvStream = csv.format();

	ctx.set('content-disposition', `attachment; filename=${sheet.title}.csv`);
	ctx.set('content-type', 'text/csv');
	ctx.rawBody = true;
	ctx.body = csvStream;

	(async() => {
		csvStream.write(sheet.header);

		for(let row of sheet.rows) {
			csvStream.write(row.cells.map(cell => _get(cell, 'v', '')));
			await Promise.delay(1);
		}

		csvStream.end();
	})().catch(err => {
		csvStream.emit('error', err);
	});
}

export async function insertRowsByPlainText(ctx) {
	const sheet = ctx.state.sheet;
	const text = ctx.request.body.text;

	if (!text || typeof text !== 'string') {
		ctx.throw(400, 'Invalid text.');
	}

	const parsedRows = text.split('\n').map(rowText => {
		const cells = rowText
			.split('\t')
			.map(v => v.trim());

		return cells;
	});

	const parsedHeader = parsedRows.shift();

	if (!parsedHeader || !parsedHeader.length) {
		ctx.throw(400, 'Invalid text format: failed to detect header.');
	} else if (!parsedRows || !parsedRows.length) {
		ctx.throw(400, 'Invalid text format: failed to detect rows.');
	}

	// Merge headers
	const heaederRefs = parsedHeader.map((pHeader, index) => {
		pHeader = (pHeader || `Cell ${index + 1}`);

		let idx = sheet.header.findIndex(v =>
			v.toLowerCase() === pHeader.toLowerCase()
		);

		if (idx < 0) {
			idx = sheet.header.push(pHeader) - 1;
			ctx.log('debug', 'adding header', { pHeader, idx });
		}

		return idx;
	});

	const isFirstCellIsZero = (
		String(_get(sheet.rows, [0, 'cells', 0, 'v'])).trim() === '0'
	);

	const isFirstCellIsID = /id/i.test(sheet.header[0]);

	// Adding rows
	for(let row of parsedRows) {
		const cells = sheet.header.map(() => ({
			v: '',
			t: 'string'
		}));

		const idNum = isFirstCellIsZero
			? sheet.rows.length - 1
			: sheet.rows.length;

		for (let i = 0; i < row.length; i++) {
			const cellValue = row[i];
			const headerIdx = heaederRefs[i];

			cells[headerIdx].v = cellValue;
		}

		if (isFirstCellIsID && !_get(cells, [0, 'v'])) {
			_set(cells, [0, 'v'], idNum);
		}

		sheet.rows.push({ cells });
	}

	await sheet.save();

	ctx.body = sheet.toJSON({ virtuals: true });
}

export async function replaceRowsByPlainText(ctx) {
	const sheet = ctx.state.sheet;
	const text = ctx.request.body.text;

	if (!text || typeof text !== 'string') {
		ctx.throw(400, 'Invalid text.');
	}

	const parsedRows = text.split('\n').map(rowText => {
		const cells = rowText
			.split('\t')
			.map(v => v.trim());

		return cells;
	});

	const parsedHeader = parsedRows.shift();

	sheet.header = parsedHeader;
	sheet.rows = [];

	const isFirstCellIsID = /id/i.test(sheet.header[0]);

	// Adding rows
	for(let row of parsedRows) {
		const cells = sheet.header.map(() => ({
			v: '',
			t: 'string'
		}));

		const idNum = sheet.rows + 1;

		for (let i = 0; i < row.length; i++) {
			const cellValue = row[i];
			cells[i].v = cellValue;
		}

		if (isFirstCellIsID && !_get(cells, [0, 'v'])) {
			_set(cells, [0, 'v'], idNum);
		}

		sheet.rows.push({ cells });
	}

	await sheet.save();

	ctx.body = sheet.toJSON({ virtuals: true });
}
