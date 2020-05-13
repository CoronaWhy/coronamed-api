import mongoose from 'mongoose';

const Mixed = mongoose.Schema.Types.Mixed;

const SchemaCell = mongoose.Schema({
	v: { type: Mixed, default: '' },
	t: { type: String, default: 'string' }
});

const SchemaRow = mongoose.Schema({
	cells: [SchemaCell]
});

const Schema = new mongoose.Schema({
	title:     { type: String, required: true, index: true },
	name:      { type: String, required: true, index: true },
	category:  { type: String, default: '', index: true },
	header:    { type: [String] },
	rows:      { type: [SchemaRow], default: () => [] },
	createdAt: { type: Date, default: Date.now, index: true },
	updatedAt: { type: Date, default: Date.now, index: true }
}, {
	collection: 'sheets',
	minimize: false,
	versionKey: false
});

Schema.path('name').set(function(value) {
	if (
		this &&
		typeof this.set === 'function' &&
		value !== this.name
	) {
		this.title = [this.category, value]
			.filter(v => v && v.length)
			.join(' ');
	}

	return value;
});

Schema.path('category').set(function(value) {
	if (
		this &&
		typeof this.set === 'function' &&
		value !== this.category
	) {
		this.title = [value, this.name]
			.filter(v => v && v.length)
			.join(' ');
	}

	return value;
});


const Sheet = mongoose.model('Sheet', Schema);
export default Sheet;
