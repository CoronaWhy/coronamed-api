import _pick from 'lodash/pick';
import { token } from 'app-utils';
import { User, EventTracker } from 'models';

const USER_AUTH_FIELD = ['name', 'email', 'password'];
const USER_ALLOW_ANON = process.env.USER_ALLOW_ANON === 'true';
const USER_EVENT_TRACKER = EventTracker.context({ section: 'user' });


export async function signup(ctx) {
	const userData = _pick(ctx.request.body, USER_AUTH_FIELD);
	const hasPersonal = Object.keys(userData).length > 0;

	if (!userData.name) {
		userData.name = 'anon_' + Date.now();
	}

	let user;

	if (ctx._user) {
		USER_AUTH_FIELD.forEach(key => {
			if (userData[key]) return;
			ctx.throw(400, `body.${key} required.`);
		});

		user = ctx._user;
		user.set(userData);
		user.roles = ['ROLE_USER'];

		user.apikey = await User.findById(user._id).select('apikey')
			.lean()
			.then(v => v.apikey);
	} else {
		user = new User(userData);

		if (!hasPersonal) {
			!USER_ALLOW_ANON && ctx.throw(400, 'Unable to create anon user');

			user.roles = ['ROLE_ANON'];
			user.setRandomPassword();
		}
	}

	if (!user.apikey) {
		user.refreshApiKey();
	}

	USER_EVENT_TRACKER.write({
		name: 'user_signup',
		msg: user.email || user.name,
		metadata: {
			userId: user._id,
			ipAddress: ctx.realIp
		}
	});

	await user.save();

	const response = user.toJSON({ virtuals: true });
	const apikey = user.apikey;

	delete response.password;
	delete response.apikey;

	ctx.body = {
		access_token: token.create(user._id),
		apikey: apikey,
		user: response
	};
}

export async function loginByApiKey(ctx) {
	const user = ctx._user.toJSON({ virtuals: true });
	const apikey = await User.findById(user._id, 'apikey')
		.lean()
		.then(r => r ? r.apikey : null);

	delete user.password;
	delete user.apikey;

	USER_EVENT_TRACKER.write({
		name: 'user_login_apikey',
		msg: user.email,
		metadata: {
			userId: user._id,
			ipAddress: ctx.realIp
		}
	});

	ctx.body = {
		access_token: token.create(user._id),
		apikey: apikey,
		user: user
	};
}

export async function loginByEmail(ctx) {
	const { email, password } = ctx.request.body;
	const user = await User.findOne({ email: email }, '+password +apikey');

	const isValid = user ? await user.comparePassword(password) : false;

	if (!isValid) {
		ctx.throw(401);
	}

	const response = user.toJSON({ virtuals: true });
	const apikey = user.apikey;

	delete response.password;
	delete response.apikey;

	USER_EVENT_TRACKER.write({
		name: 'user_login_password',
		msg: user.email,
		metadata: {
			userId: user._id,
			ipAddress: ctx.realIp
		}
	});

	ctx.body = {
		access_token: token.create(user._id),
		apikey: apikey,
		user: response
	};
}

export async function sendResetEmail(ctx) {
	const { email } = ctx.request.body;

	await User.sendResetEmail(email);

	USER_EVENT_TRACKER.write({
		name: 'user_password_forgot',
		msg: email,
		metadata: {
			email,
			ipAddress: ctx.realIp
		}
	});

	ctx.body = 'ok';
}

export async function resetPassword(ctx) {
	const { code, email, password } = ctx.request.body;

	await User.resetPassword({ code, email, password });

	USER_EVENT_TRACKER.write({
		name: 'user_password_reset',
		msg: email,
		metadata: {
			email,
			code,
			ipAddress: ctx.realIp
		}
	});

	ctx.body = 'ok';
}

export function getMe(ctx) {
	const user = ctx._user.toJSON({ virtuals: true });
	delete user.password;
	delete user.apikey;

	ctx.body = user;
}

export async function updateMe(ctx) {
	const user = ctx._user;
	const data = _pick(ctx.request.body, USER_AUTH_FIELD);

	user.set(data);
	await user.save();

	const result = user.toJSON({ virtuals: true });
	delete user.password;
	delete user.apikey;

	USER_EVENT_TRACKER.write({
		name: 'user_update',
		msg: user.name,
		metadata: {
			userId: user._id,
			ipAddress: ctx.realIp,
			update: data
		}
	});

	ctx.body = result;
}
