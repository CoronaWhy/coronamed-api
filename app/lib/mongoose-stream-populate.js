import mongoose from 'mongoose';
import _get from 'lodash/get';
import _set from 'lodash/set';
import _keyBy from 'lodash/keyBy';
import _uniq from 'lodash/uniq';

import { mapStream, trasnformToBatchStream, streamCombiner } from 'utils/stream';

export default function mongooseStreamPopulate(
	modelName,
	keyPath,
	select
) {
	let batchSize = 10;
	let read, lean;

	if (arguments[0] && typeof arguments[0] === 'object') {
		modelName = arguments[0].modelName;
		keyPath = arguments[0].keyPath;
		select = arguments[0].select;
		batchSize = arguments[0].batchSize || batchSize;
		read = arguments[0].read;
		lean = arguments[0].lean;
	}

	const Model = mongoose.model(modelName);
	const cacheMap = {};

	const fetchResources = async(resourceIds) => {
		resourceIds = resourceIds.filter(id => cacheMap[id] === undefined);

		if (!resourceIds.length) {
			return;
		}

		for (let resourceId of resourceIds) {
			cacheMap[resourceId] = null;
		}

		const query = Model.find({ _id: { $in: resourceIds } });

		if (lean !== false) query.lean();
		if (read) query.read(read);
		if (select) query.select(select);

		const list = await query;
		const resourceMap = _keyBy(list, '_id');

		Object.assign(cacheMap, resourceMap);
	};

	const streamBatch = trasnformToBatchStream({ size: batchSize });
	const streamMap = mapStream(async batch => {
		const resourceIds = _uniq(
			batch.map(obj => _get(obj, keyPath)).flat()
		);

		while(resourceIds.length > 0) {
			const ids = resourceIds.splice(0, batchSize);

			await fetchResources(ids);
		}

		for (let obj of batch) {
			let resourceValue = _get(obj, keyPath);
			let result = null;

			if (Array.isArray(resourceValue)) {
				result = resourceValue.map(id => cacheMap[id] || null);
			} else {
				result = cacheMap[resourceValue] || null;
			}

			_set(obj, keyPath, result || null);
		}

		return batch;
	}, { flatMode: true });

	return streamCombiner(streamBatch, streamMap);
}
