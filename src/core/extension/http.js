const http = require('http');
const https = require('https');

//Expose node.js http native API
//Only request and get methods
module.exports.http = {
    request: http.request,
    get: http.get
};

//Same for https
module.exports.https = {
    request: https.request,
    get: https.get
};
