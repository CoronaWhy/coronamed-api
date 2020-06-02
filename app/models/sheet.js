import _get from 'lodash/get';

import mongoose from 'mongoose';
import Promise from 'bluebird';

import { castCellType } from 'services/sheets';

const DB_CORD19 = mongoose.__openConnection('cord19');

const Mixed = mongoose.Schema.Types.Mixed;

const SchemaCell = mongoose.Schema({
	v: { type: Mixed, default: '' },
	t: { type: String, default: 'string' }
});

const SchemaRow = mongoose.Schema({
	cells: [SchemaCell]
});

const Schema = new mongoose.Schema({
	title:         { type: String, required: true, index: true },
	name:          { type: String, required: true, index: true },
	category:      { type: String, default: '', index: true },
	header:        { type: [String] },
	rows:          { type: [SchemaRow], default: () => [] },
	recordsAmount: { type: Number, default: 0 },
	createdAt:     { type: Date, default: Date.now, index: true },
	updatedAt:     { type: Date, default: Date.now, index: true }
}, {
	collection: 'questions',
	minimize: false,
	versionKey: false
});

Schema.pre('save', function(next) {
	// Update records amount on fly
	if (this.rows && this.recordsAmount !== this.rows.length) {
		this.recordsAmount = this.rows.length;
	}

	return next();
});

Schema.path('name').set(function(value) {
	if (
		this &&
		typeof this.set === 'function' &&
		value !== this.name
	) {
		this.title = [this.category, value]
			.filter(v => v && v.length)
			.join(' ');
	}

	return value;
});

Schema.path('category').set(function(value) {
	if (
		this &&
		typeof this.set === 'function' &&
		value !== this.category
	) {
		this.title = [value, this.name]
			.filter(v => v && v.length)
			.join(' ');
	}

	return value;
});

Schema.virtual('isFirstHeaderID').get(function() {
	const firstHeader = this.header[0] || '';

	if (firstHeader === '') {
		return true;
	}

	return /id/i.test(firstHeader);
});

Schema.virtual('isFirstRecordZero').get(function() {
	return String(_get(this.rows, [0, 'cells', 0, 'v'])).trim() === '0';
});

Schema.virtual('nextRowID').get(function() {
	const sheet = this;

	return sheet.isFirstRecordZero
		? sheet.rows.length - 1
		: sheet.rows.length;
});

Schema.virtual('headerIdxMap').get(function() {
	const sheet = this;
	const result = {};

	if (sheet.header && sheet.header.length > 0) {
		sheet.header.forEach((headerName, headerIdx) => {
			result[headerName] = headerIdx;
		});
	}

	return result;
});

Schema.methods.addRow = function sheetAddRow(returnRow) {
	const sheet = this;

	if (!Array.isArray(sheet.rows)) {
		sheet.rows = [];
	}

	const rowIdx = (sheet.rows.push({ cells: [] })) - 1;

	return returnRow
		? sheet.rows[rowIdx]
		: rowIdx;
};

Schema.methods.addCell = async function sheetAddCeel(rowIdx, cellData) {
	const sheet = this;
	const row = sheet.rows[rowIdx];

	switch (true) {
		case !row:
			throw new TypeError(`Sheet has no row with ${rowIdx} index.`);

		case !cellData || cellData === null || typeof cellData !== 'object':
			throw new TypeError(`CellData is not valid object.`);

		case !cellData.t || typeof cellData.t !== 'string':
			throw new TypeError(`Cell "t" property missed or not valid string.`);

		case cellData.v === undefined:
			throw new TypeError(`Cell "v" property cannot be undefined.`);
	}

	switch (true) {
		case sheet.isFirstHeaderID && !cellData.v && row.cells.length === 0:
			cellData = { v: sheet.nextRowID, t: 'number' };
			break;

		case cellData.t === 'auto':
			cellData = await castCellType(cellData.v);
			break;
	}

	if (
		row.cells.length === 0 &&
		cellData.t === 'number' &&
		sheet.isFirstHeaderID &&
		cellData.v !== sheet.nextRowID
	) {
		cellData.v = sheet.nextRowID;
	}

	const cellIdx = (row.cells.push({
		v: cellData.v,
		t: cellData.t
	})) - 1;

	sheet.padHeader(cellIdx + 1);

	return cellIdx;
};

Schema.methods.padHeader = function sheetPadHeader(size) {
	const sheet = this;

	if (!Array.isArray(sheet.header)) {
		sheet.header = [];
	}

	const missAmount = size - sheet.header.length;

	if (missAmount <= 0) {
		return;
	}

	for (let i = 0; i < missAmount; i++) {
		const headerId = i + sheet.header.length + 1;
		sheet.header.push(`Header ${headerId}`);
	}
};

Schema.methods.joinArray = async function sheetJoinArray(arr) {
	const sheet = this;

	// Make copy
	const joinRows = [...arr];

	// Use first row as header
	const joinHeaders = joinRows.shift();

	if (!joinRows.length) {
		throw new TypeError('The joining rows are empty.');
	}

	// Compute cell refs
	const cellRefsTaken = {};

	const cellRefs = joinHeaders.map((joinHeader, index) => {
		// Assign auto generated header name
		if (!joinHeader || typeof joinHeader !== 'string') {
			joinHeader = `Header ${(index + sheet.header.length)}`;
		}

		joinHeader = joinHeader.trim();

		// Trying to find existed header
		let cellRef = -1;

		for (let headerIdx = 0; headerIdx < sheet.header.length; headerIdx++) {
			const sheetHeader = sheet.header[headerIdx];
			const isTaken = !!cellRefsTaken[headerIdx];

			const isMatchedHeader = (
				sheetHeader.toLowerCase() === joinHeader.toLowerCase()
			);

			// console.log({ cell: index, joinHeader, headerIdx, cellRef, isMatchedHeader, isTaken });

			if (isMatchedHeader && !isTaken) {
				cellRef = headerIdx;
				break;
			}
		}

		// Adding unexisted header
		if (cellRef < 0) {
			cellRef = sheet.header.push(joinHeader) - 1;
		}

		cellRefsTaken[cellRef] = true;
		return cellRef;
	});

	// Adding rows
	for (let joinRow of joinRows) {
		// Generate empty row cells
		const cells = sheet.header.map(() => ({
			v: '',
			t: 'string'
		}));

		// Assign first cell with auto genereted num
		if (sheet.isFirstHeaderID) {
			cells[0].v = sheet.nextRowID;
		}

		for (let i = 0; i < joinRow.length; i++) {
			const cellValue = joinRow[i];
			const cellIdx = cellRefs[i];

			cells[cellIdx] = await castCellType(cellValue);
		}

		sheet.rows.push({ cells });

		await Promise.delay(1);
	}
};

Schema.methods.replaceWithArray = async function sheetReplaceWithArray(arr) {
	if (arr.length < 2) {
		throw new TypeError('The joining rows are empty.');
	}

	const sheet = this;

	sheet.header = [];
	sheet.rows = [];

	await sheet.joinArray(arr);
};

Schema.methods.getCellIndexByName = function(headerName) {
	let idx = this.headerIdxMap[headerName];

	if (typeof idx === 'number') {
		return idx;
	}

	return -1;
};

Schema.methods.getCell = function(rowId, cellId) {
	const sheet = this;

	if (typeof cellId === 'string') {
		cellId = sheet.getCellIndexByName(cellId);
	}

	if (cellId < 0) {
		return null;
	}

	return _get(sheet.rows, [rowId, cellId], null);
};

const Sheet = DB_CORD19.model('Sheet', Schema);
export default Sheet;
