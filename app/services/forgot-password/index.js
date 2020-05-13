import pug from 'pug';
import _defaults from 'lodash/defaults';
import { AppError } from 'app-utils';

import RP from './rp-model';
import {
	DEF_METHOD,
	DEF_DELIVERY_METHOD,
	DEF_EXPIRED_TIME,
	DEF_FROM_EMAIL
} from './constants';

const DEF_OPTIONS = {
	type:           DEF_METHOD,
	deliveryMethod: DEF_DELIVERY_METHOD,
	expiredTime:    DEF_EXPIRED_TIME,
	emailFeild:     'email',
	nameField:      'name',
	passField:      'password',
	subject:        'Reset password request',
	fromEmail:      DEF_FROM_EMAIL
};

export default function forgotPasswordPlugin(schema, options = {}) {
	options = _defaults(options, DEF_OPTIONS);

	let err;
	switch (true) { // eslint-disable-line default-case
		case options.type === 'email' && !options.subject:
			err = 'options.subject is required';
			break;

		case options.type === 'email' && !options.template && !options.templatePath:
			err = 'options.template or options.templatePath path is required';
			break;
	}

	if (err) {
		throw new TypeError(err);
	}

	schema.statics.sendResetEmail = async function sendResetEmail(email, data) {
		const account = await this.findOne({
			[options.emailFeild]: email
		});

		if (!account) {
			throw new AppError(`Account with email '${email}' does not exist`);
		}

		return account.sendResetEmail(data);
	};

	schema.methods.sendResetEmail = async function sendResetEmail(data = {}) {
		const doc = this;
		const recipientEmail = (
			data.email ||
			doc.get(options.emailFeild)
		);

		const recipientName = (
			data.name ||
			recipientEmail ||
			doc.get(options.nameField)
		);

		const rp = new RP({
			code:         getRandomInt(100000, 999999).toString(),
			email:        recipientEmail,
			account:      doc._id,
			accountName:  doc.constructor.modelName,
			expireAt:     Date.now() + (options.expiredTime * 1000),
			used:         false,
			type:         'email'
		});

		await rp.save();

		const vars = Object.assign({},
			{ rp:      rp.toObject({ virtuals: true }) },
			{ account: doc.toObject() },
			data,
			options.vars || {}
		);

		const html = options.template
			? pug.render(options.template, vars)
			: pug.renderFile(options.templatePath, vars);

		const msg = {
			subject:    options.subject,
			from_email: options.fromEmail,
			from_name:  options.fromName,
			html:       html,
			to:         [{
				email: recipientEmail,
				name:  recipientName,
				type: 'to'
			}],
			images: data.images || []
		};

		return options.deliveryMethod(msg, doc);
	};

	schema.statics.resetPassword = async function resetPassword(params) {
		switch (true) {
			case !params.code:
				throw new AppError('Code is required', 400);

			case !params.password:
				throw new AppError('Password is required', 400);

			case !params.email:
				throw new AppError('Email is required', 400);
		}

		const rp = await RP.findOne({
			code: params.code,
			email: params.email
		}).populate('account');

		switch (true) {
			case !rp:
				throw new AppError('Your reset password request has expired', 403);

			case rp.used:
				throw new AppError('Your reset password request has used', 403);

			case !rp.account:
				throw new AppError('Your reset password account not exists', 403);
		}

		rp.account.set(options.passField, params.password);
		rp.set('used', true);

		await rp.account.save();
		await rp.save();
	};
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
