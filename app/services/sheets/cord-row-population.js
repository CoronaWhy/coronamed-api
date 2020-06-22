import _get from 'lodash/get';
import { mapStream, trasnformToBatchStream, streamCombiner } from 'utils/stream';

import mongoose from 'lib/mongoose';

const DB_CORD19 = mongoose.__openConnection('cord19');

export default function cordRowPopulation() {
	const cacheMap = {};
	const batchSize = 10;

	const fetchResources = async(ids) => {
		ids = ids.filter(id => cacheMap[id] === undefined);

		if (!ids.length) {
			return;
		}

		for (let resourceId of ids) {
			cacheMap[resourceId] = null;
		}

		const list = await DB_CORD19.collection('v19').find({
			cord_uid: { $in: ids }
		}, { doi: 1 }).toArray();

		list.forEach(v => {
			const link = resolveHttpProtocol(v.doi);
			cacheMap[v['cord_uid']] = link;
		});
	};

	const streamBatch = trasnformToBatchStream({ size: batchSize });
	const streamMap = mapStream(async batch => {
		const resourceIdsMap = {};
		const resourceAssignMap = {};
		const rows = [];

		for (let rowIdx = 0; rowIdx < batch.length; rowIdx++) {
			const row = batch[rowIdx].row || batch[rowIdx];
			const cells = _get(row, 'cells', []);

			rows.push(row);

			for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
				const cell = cells[cellIdx];

				if (cell.t === 'cord_ref') {
					resourceIdsMap[cell.v] = true;
					resourceAssignMap[`${rowIdx}:${cellIdx}`] = cell.v;
				}
			}
		}

		const resourceIds = Object.keys(resourceIdsMap);

		while(resourceIds.length > 0) {
			const ids = resourceIds.splice(0, batchSize);
			await fetchResources(ids);
		}

		for(let pattern of Object.keys(resourceAssignMap)) {
			const cordUid = resourceAssignMap[pattern];
			const [rowIdx, cellIdx] = pattern.split(':').map(v => parseInt(v));

			const resourceValue = cacheMap[cordUid] || null;

			rows[rowIdx].cells[cellIdx].link = resourceValue;
		}

		return rows;
	}, { flatMode: true });

	return {
		stream: streamCombiner(streamBatch, streamMap)
	};
}

function resolveHttpProtocol(str, defProtocol ='http') {
	if (/^http/.test(str)) {
		return str;
	}

	return `${defProtocol}://${str}`;
}
