var express = require('express');
var app = express();

var config = require('../borderline-config.js');
var BorderlineServer = require('./borderlineServer.js');

//Remove unwanted express headers
app.set('x-powered-by', false);

app.use(BorderlineServer({
        mongoUrl: config.mongoUrl,
        extensionSourcesFolder: config.extensionSourcesFolder,
        extensionFileSystemFolder: config.extensionFileSystemFolder,
        uiFolder: config.uiFolder,
        development: true,
        enableCors: config.enableCors,
        port: config.port
    }
));

app.listen(config.port, function (err) {
    if (err) {
        console.error(err);
        return;
    }

    console.log('Listening at http://localhost:3000/');
});
