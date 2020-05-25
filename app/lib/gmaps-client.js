import config from 'config';
import Promise from 'bluebird';
import gmaps from '@google/maps';

const googleMapsClient = gmaps.createClient({
	key: config.get('google.apikey'),
	Promise: Promise
});

export default googleMapsClient;
