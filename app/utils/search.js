/**
 * Parsing searching alias params
 * @param  {Object} aliasMap Alias object map
 * @param  {Object} params   Search params
 * @return {Object}          Matching object criteria
 */
export async function parseSearchAlias(aliasMap, params) {
	const conds = [];
	const paramsList = Object.keys(aliasMap);

	for (let i = 0; i < paramsList.length; i++) {
		const paramName  = paramsList[i];
		const alias      = aliasMap[paramName];
		const paramValue = params[paramName];

		if (!alias) {
			continue;
		}

		delete params[paramName];

		if (paramValue === undefined) {
			continue;
		}

		if (typeof alias === 'function') {
			const result = await alias(paramValue);

			if (typeof result === 'object' && result !== null) {
				conds.push(result);
			} else if (result !== undefined) {
				conds.push({ [paramName]: result });
			}
		} else {
			conds.push({ [alias]: paramValue });
		}
	}

	if (conds.length) {
		return { $and: conds };
	}

	return {};
}

export function parseSearchList(str, {
	fieldName,
	operator = '$in',
	separator = ','
}) {
	if (typeof str !== 'string') {
		return;
	}

	const list = str
		.split(separator)
		.filter(v => !!v.length);

	if (!list.length) {
		return;
	}

	return { [fieldName]: { [operator]: list } };
}
