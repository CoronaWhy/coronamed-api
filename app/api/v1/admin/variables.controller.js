import { Variable } from 'models';

export function getVariables(ctx) {
	ctx.jsonStream = true;
	ctx.body = Variable.find().lean().cursor();
}

export async function getVariableByKey(ctx) {
	const { keyName } = ctx.params;
	const data = await Variable.findById(keyName).lean();

	if (!data) {
		ctx.throw(404);
	}

	ctx.body = data.value;
}

export async function updateVariableByKey(ctx) {
	const { keyName } = ctx.params;
	const data = await Variable.findById(keyName);
	const { value } = ctx.request.body;

	if (!data) {
		ctx.throw(404);
	} else if (typeof value !== typeof data.value) {
		ctx.throw(400, `incorrect value type, should be a ${typeof data.value}`);
	}

	data.set('value', value);
	await data.save();

	ctx.body = data.value;
}
