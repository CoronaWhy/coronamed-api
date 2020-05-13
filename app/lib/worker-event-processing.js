import _get from 'lodash/get';
import _isFunction from 'lodash/isFunction';
import EventTracker from 'models/event-tracker';

export default function workerEventProcessing({
	beforeRun,
	afterRun,
	labelDone,
	labelTarget,
	resultKey = null,
	batchMatch = null,
	batchParallel = 4,
	batchLimit = 100,
	batchGetter,
	processEvent
}) {
	return async function() {
		const worker = this;
		const result = { success: 0, fails: 0, critial: 0 };

		if (beforeRun) await beforeRun.call(worker);

		resultKey = resultKey || `metadata.${worker.name}`;
		labelDone = labelDone || `${worker.name}: done`;

		if (!labelTarget && labelTarget !== false) {
			labelTarget = worker.name;
		}

		const eventFilter = {
			$and: [
				{ 'labels': { $ne: labelDone } }
			]
		};

		if (labelTarget) {
			eventFilter.$and.unshift({ labels: labelTarget });
		}

		if (batchMatch) {
			const match = _isFunction(batchMatch) ? batchMatch() : batchMatch;
			eventFilter.$and.unshift(match);
		}

		if (!batchGetter) {
			batchGetter = function(filter, params) {
				return EventTracker.find(filter)
					.lean()
					.sort({ date: 1 })
					.limit(params.limit);
			};
		}

		const butch = await batchGetter(eventFilter, { limit: batchLimit });

		while (butch.length > 0) {
			const events = butch
				.splice(0, batchParallel)
				.map(event => {
					const finalState = { errors: [] };

					return processEvent(event, finalState)
						.then(onSuccess.bind(null, event, finalState))
						.catch(onError.bind(null, event, finalState));
				});

			await Promise.all(events);
		}

		if (afterRun) await afterRun.call(worker, result);

		return result;

		function onSuccess(eventData, finalState, processResult) {
			if (processResult !== finalState) {
				finalState.result = processResult;
			}

			finalState.success = !finalState.errors.length;

			if (!finalState.success) {
				finalState.success = false;
				finalState.error = true;
				finalState.errMsg = _get(finalState, 'errors.0.error.message', 'error occurred while processing.');
				finalState.errCritical = false;

				result.fails++;
			} else {
				result.success++;
			}

			return done(eventData, finalState);
		}

		function onError(eventData, finalState, err) {
			const eventName = 'critical_error';

			result.critial++;
			worker.log.error({ event: eventName, eventData, err });

			finalState.errors.push({ event: eventName, error: err });
			finalState.error = true;
			finalState.errMsg = err.message;
			finalState.errCritical = true;

			return done(eventData, finalState);
		}

		function done(eventData, result) {
			// normalize error object to mongo document
			if (result.errors.length) {
				result.errors.forEach(obj => {
					const errMsg = _get(obj, 'error.message', null);

					if (errMsg) {
						obj.error = errMsg;
					}
				});
			}

			const update = {
				$addToSet: { labels: labelDone },
				$set: { [resultKey]: result }
			};

			if (eventData.eventIds) {
				return EventTracker.updateMany({ _id: { $in: eventData.eventIds } }, update);
			} else {
				return EventTracker.updateOne({ _id: eventData._id }, update);
			}
		}
	};
}
