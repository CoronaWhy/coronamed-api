import _get from 'lodash/get';

import { mapStream } from 'utils/stream';

export default function publicRownTrasnform(sheet) {
	const sheetHeader = sheet.header;
	const publicHeader = [
		(sheetHeader[0] || 'ID'),
		'Date',
		'Study',
		'Severe',
		'Fatality',
		'Study type',
		'Sample Size',
		'Study population'
	];

	const sheetHeaderIdx = sheet.headerIdxMap;

	const emptyCell = {
		v: '',
		t: 'string',
		_id: null
	};

	const transformStream = mapStream(async data => {
		const row = data.row || data;

		const cell = (headerName, def = null) => (
			_get(row, ['cells', sheetHeaderIdx[headerName]], def)
		);

		// Date <— [Date]
		const dateCell = cell('Date', emptyCell);

		// Study <— [Study + Study link] ([Journal])
		const studyCell = (() => {
			const studyLinkCell = cell('Study link');
			const urlCell = cell('URL');

			const urlLink = (
				_get(studyLinkCell, 'link') ||
				_get(studyLinkCell, 'v') ||
				_get(urlCell, 'link') ||
				_get(urlCell, 'v')
			);

			const titleCell = _get(cell('Title'), 'v');
			let journalCell = _get(cell('Journal'), 'v');

			if (journalCell) journalCell = `(${journalCell})`;

			const urlTitle = [titleCell, journalCell]
				.filter(v => v && v.length)
				.join(' ');

			if (typeof urlLink === 'string' && /^http/.test(urlLink)) {
				return { v: urlLink, t: 'url', title: urlTitle };
			}

			return emptyCell;
		})();

		// Severe <— [Severe Calculated] [Critical only] [Severe Adjusted] [Severe], 95%CI: ([Severe lower],[Severe upper]); p=[Severe p-value]
		const severeCell = (() => {
			const parts = [];

			const severeInfo = [
				_get(cell('Severe Calculated'), 'v'),
				_get(cell('Critical only'), 'v'),
				_get(cell('Severe Adjusted'), 'v'),
				_get(cell('Severe'), 'v')
			].filter(v => !isEmpty(v)).join(' ').trim();

			const severeRange = [
				_get(cell('Severe lower bound'), 'v'),
				_get(cell('Severe upper bound'), 'v')
			].filter(v => !isEmpty(v)).join(', ').trim();

			const pValue = _get(cell('Severe p-value'), 'v');

			if (severeInfo) {
				parts.push(severeInfo);
			}

			if (severeRange) {
				parts.push(`95%CI: (${severeRange})`);
			}

			if (!isEmpty(pValue)) {
				parts.push(`p=${pValue}`);
			}

			return {
				v: parts.join(', ').trim(),
				t: 'string',
				severeInfo,
				severeRange,
				pValue,
				_id: null
			};
		})();

		// [Fatality Calculated] [Discharged vs. death?] [Fatality Adjusted] [Fatality], 95%CI: ([Fatality Lower], [Fatality Upper]);p=[Fatality p-value]
		const fatalityCell = (() => {
			const parts = [];

			const fatalityInfo = [
				_get(cell('Fatality Calculated'), 'v'),
				_get(cell('Discharged vs. death?'), 'v'),
				_get(cell('Fatality Adjusted'), 'v'),
				_get(cell('Fatality'), 'v')
			].filter(v => !isEmpty(v)).join(' ').trim();

			const fatalityRange = [
				_get(cell('Fatality lower bound'), 'v'),
				_get(cell('Fatality upper bound'), 'v')
			].filter(v => !isEmpty(v)).join(', ').trim();

			const pValue = _get(cell('Fatality p-value'), 'v');

			if (fatalityInfo) {
				parts.push(fatalityInfo);
			}

			if (fatalityRange) {
				parts.push(`95%CI: (${fatalityRange})`);
			}

			if (!isEmpty(pValue)) {
				parts.push(`p=${pValue}`);
			}

			return {
				v: parts.join(', ').trim(),
				t: 'string',
				_id: null,
				fatalityInfo,
				fatalityRange,
				pValue
			};
		})();

		const studyTypeCellValue = (
			_get(cell('Study type'), 'v') ||
			_get(cell('Design'), 'v') ||
			''
		);

		row.cells = [
			cell('ID', emptyCell),
			dateCell,
			studyCell,
			severeCell,
			fatalityCell,
			{ v: studyTypeCellValue, t: 'string' },
			cell('Sample Size') || cell('Sample') || emptyCell,
			cell('Study population', emptyCell)
		].map(cell => {
			// Null values should be represented in a different way that is less likely to be confused with the word “No”.  I suggest blank cells or hyphens.
			if (typeof cell.v === 'string' && !cell.v.length) {
				cell.v = '-';
			}

			return cell;
		});

		return row;
	});

	return {
		header: publicHeader,
		stream: transformStream
	};
}

function isEmpty(v) {
	return v === undefined || v === null || v === '';
}
