var express = require('express');
var app = express();

var config = require('../borderline-config.js');
var BorderlineServer = require('./borderlineServer.js');

//Remove unwanted express headers
app.set('x-powered-by', false);

app.use(BorderlineServer({
        mongoUrl: config.mongoUrl,
        pluginSourcesFolder: config.pluginSourcesFolder,
        pluginFileSystemFolder: config.pluginFileSystemFolder,
        uiFolder: config.uiFolder,
        development: true
    }
));

app.listen(3000, function (err) {
    if (err) {
        return console.error(err);
    }

    console.log('Listening at http://localhost:3000/');
});
