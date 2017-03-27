const path = require('path');
const fs = require('fs-extra');

var Options = function(configuration) {
    this.mongoUrl = configuration.mongoUrl ? configuration.mongoUrl : 'mongodb://root:root@127.0.0.1:27020/borderline';

    this.pluginSourcesFolder = configuration.pluginSourcesFolder ? configuration.pluginSourcesFolder : './.plugins/sources';
    this.pluginFileSystemFolder = configuration.pluginFileSystemFolder ? configuration.pluginFileSystemFolder : './.plugins/filesystem';
    this.borderlineUiFolder =  configuration.borderlineUiFolder ? configuration.borderlineUiFolder : './node-modules/borderline-ui';
    this.development = configuration.development ? configuration.development : false;
    this.enableCors  = configuration.enableCors ? configuration.enableCors : false;

    this._ensureFolder(this.pluginSourcesFolder);
    this._ensureFolder(this.pluginFileSystemFolder);
};


Options.prototype._ensureFolder = function(inputPath) {
    var absolutePath = path.resolve(inputPath);
    var paths = absolutePath.split(path.sep);
    var currentPath = paths[0];
    for (var i = 1; i < paths.length; i++) {
        currentPath = path.resolve(path.join(currentPath, paths[i]));
        if (fs.existsSync(currentPath) === false) {
            fs.mkdirSync(currentPath);
        }
    }
};

module.exports = Options;
