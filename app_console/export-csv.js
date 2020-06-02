// npm run console -- export-csv

import Promise from 'bluebird';
import path from 'path';
import glob from 'glob';
import * as csv from '@fast-csv/parse';

import Script from 'lib/script';
import mongoose from 'lib/mongoose';
import { Sheet } from 'models';

const script = new Script(module, {
	doWork,
	argvParams: {
		default: {
			f: path.resolve('app_console', 'seeds/sheets', '**', '*.csv')
		}
	}
});

script.on('complete', () => mongoose.disconnect());

export default script;

async function doWork(params) {
	await Promise.delay(5000);

	const listPath = path.resolve('app_console', 'seeds', params.f);
	const listFiles = glob.sync(listPath);

	const items = [];

	// Parsing CSV files
	for(let filePath of listFiles) {
		await new Promise((resolve) => {
			script.log.info('parse: %s', filePath);

			const rows = [];

			const parsedFilePath = filePath.split(path.sep);

			const name = frendlyString(
				trimExt(parsedFilePath.pop() || 'None')
			);

			const category = frendlyString(parsedFilePath.pop());

			let header = null;

			csv.parseFile(filePath)
				.on('error', err => {
					script.log.warn('failed to parse %s with %s', filePath, err.message);
					resolve();
				})
				.on('data', row => {
					if (header) {
						rows.push(row);
					} else {
						if (row.length > 0 && !row[0]) row[0] = 'ID';
						header = row;
					}
				})
				.on('end', () => {
					items.push({ filePath, name, category, header, rows });
					resolve();
				});
		});
	}

	// Insert into database
	for(let item of items) {
		const sheet = await Sheet.findOne({
			name: item.name,
			category: item.category
		}).then(sheet => {
			return sheet || new Sheet();
		});

		sheet.set({
			name: item.name,
			category: item.category,
			header: item.header,
			updatedAt: new Date(),
			rows: []
		});

		for(let itemRow of item.rows) {
			const sheetRowIdx = sheet.addRow();

			for(let cellValue of itemRow) {
				await sheet.addCell(sheetRowIdx, {
					v: cellValue,
					t: 'auto'
				});
			}
		}

		await sheet.save();
	}

	return { amount: items.length };
}

export function trimExt(str) {
	const parts = str.split('.');

	if (parts.length > 1) {
		return parts.slice(0, -1).join('.');
	}

	return str;
}

export function frendlyString(str) {
	str = trimExt(str);

	const result = str
		.replace(/[-_]/g, ' ')
		.replace(/\\/g, ' ')
		.replace(/\//g, ' ')
		.replace(/[^0-9a-zA-Z ]/gi, '')
		.replace(/ +(?= )/g, '')
		.trim();

	return result;
}
