import _get from 'lodash/get';

import mongoose from 'mongoose';
import Promise from 'bluebird';

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
	collection: 'sheets',
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
			console.log('adding:', { cellRef, joinHeader });
		}

		cellRefsTaken[cellRef] = true;
		return cellRef;
	});

	const isIDFirst = /id/i.test(sheet.header[0]);

	const isIDFirstCellZero = (
		String(_get(sheet.rows, [0, 'cells', 0, 'v'])).trim() === '0'
	);

	// Adding rows
	for (let joinRow of joinRows) {
		// Generate empty row cells
		const cells = sheet.header.map(() => ({
			v: '',
			t: 'string'
		}));

		// Assign first cell with auto genereted num
		if (isIDFirst) {
			cells[0].v = isIDFirstCellZero
				? sheet.rows.length - 1
				: sheet.rows.length;
		}

		for (let i = 0; i < joinRow.length; i++) {
			const cellValue = joinRow[i];
			const cellIdx = cellRefs[i];

			cells[cellIdx].v = cellValue;
		}

		console.log('row:', cells.map(v => v.v));

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

const Sheet = mongoose.model('Sheet', Schema);
export default Sheet;
