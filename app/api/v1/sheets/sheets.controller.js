import _get from 'lodash/get';
import Promise from 'bluebird';
import archiver from 'archiver';
import moment from 'moment';

import * as csv from '@fast-csv/format';

import sheetclip from 'lib/sheetclip';
import mongoose from 'lib/mongoose';

import { escapeRegExp, parseSortExpression } from 'utils/str';
import { mapStream } from 'utils/stream';

import { Sheet } from 'models';

const DB_CORD19 = mongoose.__openConnection('cord19');

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
	const result = ctx.state.sheet.toJSON({ virtuals: true });
	delete result.rows;

	ctx.body = result;
}

export async function getSheetRows(ctx) {
	const sheet = ctx.state.sheet;

	const dbStream = Sheet.aggregate([
		{ $match: { _id: sheet._id } },
		{ $unwind: '$rows' },
		{ $project: { row: '$rows' } }
	]).cursor({ batchSize: 3 }).exec();

	const cordRefBuffer = {};

	const cordRefGetter = async(val) => {
		if (cordRefBuffer[val] !== undefined) {
			return cordRefBuffer[val];
		}

		const refDoc = await DB_CORD19.collection('v19').findOne({
			cord_uid: val
		});

		if (refDoc) {
			cordRefBuffer[val] = resolveHttpProtocol(refDoc['doi']);
		} else {
			cordRefBuffer[val] = null;
		}

		return cordRefBuffer[val];
	};

	const refPopulateStream = mapStream(async({ row }) => {
		row.cells = await Promise.map(row.cells, async cell => {
			if (cell.t === 'cord_ref') {
				cell.link = await cordRefGetter(cell.v);
			}

			return cell;
		}, { concurrency: 5 });

		return row;
	});

	ctx.jsonStream = true;
	ctx.body = dbStream.pipe(refPopulateStream);
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

export async function exportAll(ctx) {
	// Make archive
	const fileName = `coronamed-questions-${moment().format('YYYY-MM-DD')}.zip`;

	const archive = archiver('zip', {
		zlib: { level: 9 }
	});

	// Save doc into files
	Sheet.find().lean().cursor().eachAsync(async sheet => {
		const fileName = `${sheet.title}.csv`;
		const csvStream = csv.format();

		ctx.log('debug', 'export to %s', fileName);

		archive.append(csvStream, { name: fileName });

		for(let row of sheet.rows) {
			csvStream.write(row.cells.map(cell => _get(cell, 'v', '')));
			await Promise.delay(1);
		}

		csvStream.end();
	}).catch(err => {
		archive.emit('error', err);
	}).then(() => {
		archive.finalize();
	});

	ctx.set('content-disposition', `attachment; filename=${fileName}`);
	ctx.set('content-type', 'application/zip');

	ctx.rawBody = true;
	ctx.body = archive;
}

export async function insertRowsByPlainText(ctx) {
	const sheet = ctx.state.sheet;
	const input = ctx.request.body;

	let arr = null;

	switch (true) {
		case Array.isArray(input):
			arr = input;
			break;

		case typeof input === 'string':
			arr = sheetclip.parse(input);
			break;

		default:
			return ctx.throw(400, 'Invalid of body format. Expect array or plain-text.');
	}

	if (arr.length < 2) {
		ctx.throw(400, 'Invalid text format: failed to detect header.');
	}

	await sheet.joinArray(arr);
	await sheet.save();

	ctx.body = sheet.toJSON({ virtuals: true });
}

export async function replaceRowsByPlainText(ctx) {
	const sheet = ctx.state.sheet;
	const input = ctx.request.body;

	let arr = null;

	switch (true) {
		case Array.isArray(input):
			arr = input;
			break;

		case typeof input === 'string':
			arr = sheetclip.parse(input);
			break;

		default:
			return ctx.throw(400, 'Invalid of body format. Expect array or plain-text.');
	}

	if (arr.length < 2) {
		ctx.throw(400, 'Invalid text format: failed to detect header.');
	}

	await sheet.replaceWithArray(arr);
	await sheet.save();

	ctx.body = sheet.toJSON({ virtuals: true });
}

function resolveHttpProtocol(str, defProtocol ='http') {
	if (/^http/.test(str)) {
		return str;
	}

	return `${defProtocol}://${str}`;
}
