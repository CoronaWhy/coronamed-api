// npm run console -- init-seeds

import path from 'path';
import glob from 'glob';

import Script from 'lib/script';
import mongoose from 'lib/mongoose';
import 'models';

const BATCH_AMOUNT = 50;
const DEF_WRITE_MODE = "bulk";

const script = new Script(module, {
	doWork,
	argvParams: {
		default: {
			f: '*.json'
		}
	}
});

const WIRE_OPS_MODE = {
	'single': singleWrite,
	'bulk': bulkWrite
};

script.on('complete', () => mongoose.disconnect());

export default script;

async function doWork(params) {
	const listPath = path.resolve('app_console', 'seeds', params.f);
	const items = glob.sync(listPath).map(filePath => ({
		fileName: path.basename(filePath),
		module: require(filePath)
	}));

	const result = {};

	for (let i = 0; i < items.length; i++) {
		const { fileName, module } = items[i];
		const { MODEL_NAME, DATA_LIST } = module;

		const Model = mongoose.model(MODEL_NAME);
		const writeMode = module.WRITE_MODE || DEF_WRITE_MODE;
		const insertSeeds = WIRE_OPS_MODE[writeMode];

		if (!Model) {
			this.log.warn('failed to init %s, model "%s" not exists.',
				fileName,
				MODEL_NAME);

			continue;
		}

		if (!insertSeeds) {
			this.log.warn('failed to init %s, unknown write mode "%s".',
				fileName,
				writeMode);

			continue;
		}

		await insertSeeds(Model, DATA_LIST);

		this.log.info('done %s = %d writeMode = %s', fileName, DATA_LIST.length, writeMode);
		result[fileName] = DATA_LIST.length;
	}

	return result;
}

async function bulkWrite(Model, dataList) {
	const list = [...dataList];

	while (list.length > 0) {
		const batch = list.splice(0, BATCH_AMOUNT);
		const writeOps = batch.map(v => ({
			updateOne: {
				filter: { _id: v._id },
				upsert: true,
				update: { $set: v }
			}
		}));

		await Model.bulkWrite(writeOps).catch(err => {
			script.log.error({ event: 'save_error', error: err });
		});
	}
}

async function singleWrite(Model, dataList) {
	for(let obj of dataList) {
		let doc;

		if (obj._id) {
			doc = await Model.findById(obj._id);
		}

		if (!doc) {
			doc = new Model();
		}

		doc.set(obj);
		await doc.save();
	}
}
