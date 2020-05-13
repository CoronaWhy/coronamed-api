// npm run console example

import Script from 'lib/script';

export default new Script(module, {
	doWork,
	argvParams: {
		default: { step: 10 }
	}
});

async function doWork({ step }) {
	const fibonacci = [0, 1];

	for (let i = 2; i < step; i++) {
		fibonacci[i] = fibonacci[i - 1] + fibonacci[i - 2];
	}

	return fibonacci;
}
