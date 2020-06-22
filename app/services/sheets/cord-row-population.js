import Promise from 'bluebird';
import { mapStream } from 'utils/stream';

import mongoose from 'lib/mongoose';

const DB_CORD19 = mongoose.__openConnection('cord19');

export default function cordRowPopulation() {
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

	const transformStream = mapStream(async data => {
		const row = data.row || data;

		row.cells = await Promise.map(row.cells, async cell => {
			if (cell.t === 'cord_ref') {
				cell.link = await cordRefGetter(cell.v);
			}

			return cell;
		}, { concurrency: 5 });

		return row;
	});

	return {
		stream: transformStream
	};
}

function resolveHttpProtocol(str, defProtocol ='https') {
	if (/^http/.test(str)) {
		return str;
	}

	return `${defProtocol}://doi.org/${str}`;
}
