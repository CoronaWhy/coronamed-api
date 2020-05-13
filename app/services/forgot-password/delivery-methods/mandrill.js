import config from 'config';
import mandrill from 'mandrill-api';

const MANDRILL_API_KEY = (
	process.env.MANDRILL_API_KEY ||
	config.get('mandrill.apikey')
);

let CACHED_MADRILL_CLIENT;

export default function MANDRILL_DELIVERY_METHOD(msg) {
	if (!CACHED_MADRILL_CLIENT) {
		CACHED_MADRILL_CLIENT = new mandrill.Mandrill(MANDRILL_API_KEY);
	}

	return new Promise((resolve, reject) => {
		CACHED_MADRILL_CLIENT.messages.send(
			{ message: msg, async: true },
			response => resolve(response),
			err => reject(err)
		);
	});
}
