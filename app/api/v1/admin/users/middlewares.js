import { User } from 'models';

export async function ensureUserById(id, ctx, next) {
	const user = await User.findById(id);

	if (!user) {
		return ctx.throw(404);
	}

	ctx.state.user = user;
	return next();
}
