import { escapeRegExp } from 'utils/str';
import { User } from 'models';

export async function search(ctx) {
	const { limit, skip } = ctx._pag;
	const params = ctx.request.query;
	const criteria = {};

	if (params.q) {
		const expr = new RegExp(escapeRegExp(params.q), 'i');

		criteria.$or = [
			{ name: expr },
			{ email: expr }
		];
	}

	if (params.roles) {
		criteria.roles = { $in: params.roles.split(',') };
	}

	ctx.jsonStream = true;
	ctx.body = User.find(criteria)
		.lean()
		.skip(skip)
		.limit(limit)
		.cursor();
}

export async function createUser(ctx) {
	const { account } = ctx.request.body;

	if (!account) {
		ctx.throw(400, 'Missed account data');
	}

	const user = new User(account);
	user.refreshApiKey();

	let password = account.password;
	let accountType = 'user';

	if (!password) {
		password = user.setRandomPassword();
	}

	if (typeof account.role === 'string' && account.role) {
		user.roles.addToSet(account.role);
		accountType = account.role.replace('ROLE_', '').toLowerCase();
	}

	await user.save();

	const response = user.toJSON({ virtuals: true });
	delete response.password;
	delete response.apikey;

	ctx.body = {
		accountType,
		accountPassword: password,
		account: response
	};
}

export async function getUser(ctx) {
	const user = ctx.state.user.toJSON({ virtuals: true });
	ctx.body = user;
}

export async function updateUser(ctx) {
	const targetUser = ctx.state.user;
	const data = ctx.request.body;

	targetUser.set(data);
	await targetUser.save();

	const result = targetUser.toJSON({ virtuals: true });

	delete result.password;
	delete result.apikey;

	ctx.body = result;
}

export async function deleteUser(ctx) {
	const targetUser = ctx.state.user;

	await targetUser.remove();

	ctx.body = 'ok';
}
