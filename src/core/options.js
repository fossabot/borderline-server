const path = require('path');
const fs = require('fs-extra');

/**
 * @fn Options
 * @param configuration JS configuration object
 * @desc Complete the configuration object with default values
 * @constructor
 */
var Options = function(configuration) {
    this.mongoUrl = configuration.mongoUrl ? configuration.mongoUrl : 'mongodb://root:root@127.0.0.1:27020/borderline';
    this.port = configuration.port ? configuration.port : 8080;
    this.extensionSourcesFolder = configuration.extensionSourcesFolder ? configuration.extensionSourcesFolder : './.extensions/sources';
    this.extensionFileSystemFolder = configuration.extensionFileSystemFolder ? configuration.extensionFileSystemFolder : './.extensions/filesystem';
    this.borderlineUiFolder =  configuration.borderlineUiFolder ? configuration.borderlineUiFolder : './node-modules/borderline-ui';
    this.development = configuration.development ? configuration.development : false;
    this.enableCors  = configuration.enableCors ? configuration.enableCors : false;

    this._ensureFolder(this.extensionSourcesFolder);
    this._ensureFolder(this.extensionFileSystemFolder);
};

/**
 * @fn _ensureFolder
 * @desc Makes sure the given folder exists, creates it otherwise
 * @param inputPath Path string
 * @private
 */
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
