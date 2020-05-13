import crypto from 'crypto';

const DEF_HASH_ALGORITM = 'sha1';
const DEF_HASH_SALT = null;

export default function hash(
	data,
	hash = DEF_HASH_ALGORITM,
	salt = DEF_HASH_SALT
) {
	if (salt) {
		return crypto.createHmac(hash, salt)
			.update(data)
			.digest('hex');
	}

	return crypto.createHash(hash)
		.update(data)
		.digest('hex');
}
