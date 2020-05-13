export async function unAuthOrAnon(ctx, next) {
	if (!ctx._user) return next();
	if (!ctx._user.hasRole('ROLE_ANON')) {
		ctx.throw(403, 'Available only for anon users.');
	}

	return next();
}
