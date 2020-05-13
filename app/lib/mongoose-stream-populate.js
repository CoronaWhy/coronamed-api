import mongoose from 'mongoose';
import _get from 'lodash/get';
import _set from 'lodash/set';

import { mapStream } from 'utils/stream';

export default function mongooseStreamPopulate(modelName, keyPath, select) {
	const Model = mongoose.model(modelName);
	const modelCacheMap = {};

	const fetchResource = async (id, select) => {
		if (modelCacheMap[id] !== undefined) {
			return modelCacheMap[id];
		}

		const query = Model.findById(id).lean();

		if (select) {
			query.select(select);
		}

		const obj = await query;
		const result = obj || null;

		modelCacheMap[id] = result;
		return result;
	};

	return mapStream(async obj => {
		const resourceId = _get(obj, keyPath);

		if (!resourceId) {
			_set(obj, keyPath, null);
			return obj;
		}

		const resource = await fetchResource(resourceId, select);
		_set(obj, keyPath, resource);

		return obj;
	});
}
