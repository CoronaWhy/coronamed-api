import config from 'config';
import MANDRILL_DELIVERY_METHOD from './delivery-methods/mandrill';

export const DEF_COLLECTION_NAME = 'reset_passwords';
export const DEF_MODEL_NAME      = 'ResetPasswords';
export const DEF_METHOD          = 'email';
export const DEF_EXPIRED_TIME    = 60 * 30;
export const DEF_DELIVERY_METHOD = MANDRILL_DELIVERY_METHOD;
export const DEF_FROM_EMAIL = (
	process.env.FORGOT_PASSWORD_FROM ||
	config.get('email.from')
);
