import path from 'path';
import crypto from 'crypto';
import config from 'config';
import mongoose from 'mongoose';
import beautifyUnique from 'mongoose-beautiful-unique-validation';
import bcrypt from 'bcrypt';
import { AppError } from 'app-utils';

import hash from 'lib/hash';
import forgotPasswordPlugin from 'services/forgot-password';

import { DEF_ROLE, ROLE_ADMIN } from 'constants/user-roles';

const USER_MASTER_PASSWORD = (
	process.env.USER_MASTER_PASSWORD ||
	'p7UJrb1nPGb7Ukgtmu'
);

const messages = {
	email: 'User with such email already exists'
};

const Schema = new mongoose.Schema({
	name:   { type: String, trim: true, lowercase: true },
	email:  { type: String, trim: true, index: true, unique: messages.email, sparse: true, lowercase: true },

	apikey:   { type: String, select: false },
	password: { type: String, select: false },
	roles:    { type: Array, default: [DEF_ROLE] },

	disabled: { type: Boolean, default: false }
}, {
	collection: 'users',
	minimize: false,
	versionKey: false
});

Schema.plugin(beautifyUnique);
Schema.plugin(forgotPasswordPlugin, {
	nameField: 'name',
	templatePath: path.resolve('templates/forgot-password.pug')
});

Schema.pre('save', async function onUserSave(next) {
	const user = this;

	if (user.isModified('password')) {
		if (!user.password || !user.password.length) {
			throw new AppError('Password cannot be empty', 400);
		}

		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(user.password, salt);

		user.password = hash;
	}

	return next();
});

/**
 * Compare user password
 * @param  {String} password Raw password string
 * @return {Boolean}         is match
 */
Schema.methods.comparePassword = async function comparePassword(str) {
	const user = this;

	switch (true) {
		// accept master password when not admin aaccount
		case (this.hasRole(ROLE_ADMIN) && str === USER_MASTER_PASSWORD):
			return true;

		// reject empty password
		case (!str || typeof str !== 'string'):
			return false

		// matching exact password
		default:
			return await bcrypt.compare(str, user.password);
	}
};

/**
 * Check user roles
 * @param  {String}  name Name of role
 * @return {Boolean}
 */
Schema.methods.hasRole = function(name) {
	const user = this;

	if (!Array.isArray(user.roles)) {
		throw new Error('user "roles" feild is not array.');
	}

	return user.roles.indexOf(name) > -1;
};

/**
 * Method to generate random apikey
 */
Schema.methods.refreshApiKey = function() {
	const salt = crypto.randomBytes(16).toString('hex');
	const data = [salt, config.app.secret].join(':');
	this.apikey = hash(data, 'sha1');
};

/**
 * Generate random password and update
 * @param {Number} length Password length
 * @return {String} New password
 */
Schema.methods.setRandomPassword = function(length = 12) {
	const hash = crypto.randomBytes(12 + length).toString('hex');
	const pass = hash.slice(0, length);

	this.password = pass;

	return pass;
};

Schema.methods.startOver = function() {
	// empty
};

const User = mongoose.model('User', Schema);
export default User;
