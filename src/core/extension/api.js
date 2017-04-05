const url = require('url');

const http_api = require('./http');
const path_api = require('./path');
const fs_api = require('./filesystem');

function BorderlineApi(pluginUuid) {
    this.url = url;
    this.http = http_api.http;
    this.https = http_api.https;
    this.path = path_api;
    this.fs = new fs_api(pluginUuid);
}

module.exports = BorderlineApi;
