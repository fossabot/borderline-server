const fs = require('fs-extra');
const path = require('path');

function ExtensionFileSystem(extensionUuid) {
    this.uuid = extensionUuid;
    this.root = path.join(global.config.extensionFileSystemFolder, extensionUuid);
    this._bootstrap();
}

ExtensionFileSystem.prototype._bootstrap = function() {
    if (fs.existsSync(this.root) === false) {
        fs.mkdirSync(this.root);
    }
};

ExtensionFileSystem.prototype._isValidPath = function(filePath) {
    var relativeFilePath = path.relative(this.root, filePath);

    //Checking user is not trying to go outside it's root filesystem
    if (relativeFilePath.indexOf('..') !== -1)
        return false;
    return true;
};

ExtensionFileSystem.prototype.close = function(fd) {
    try {
        fs.close(fd);
    }
    catch (err) {
        console.error(err);
        return false;
    }
    return true;
};

ExtensionFileSystem.prototype.exists = function(path) {
    var filePath = path.join(this.root, path);
    if (this._isValidPath(filePath) === false)
        return false;
    return fs.existsSync(filePath);
};

ExtensionFileSystem.prototype.mkdir = function(path) {
    var filePath = path.join(this.root, path);
    if (this._isValidPath(filePath) === false)
        return false;

    try {
        fs.mkdirpSync(filePath);
    }
    catch (err) {
        console.error(err);
        return false;
    }
    return true;
};

ExtensionFileSystem.prototype.open = function(path, flags) {
    var filePath = path.join(this.root, path);
    if (this._isValidPath(filePath) === false)
        return -1;
    return fs.openSync(filePath, flags);
};

ExtensionFileSystem.prototype.read = function(fd, buf, count) {
    return fs.readSync(fd, buf, 0, count, null) ;
};

ExtensionFileSystem.prototype.readFile = function(filePath) {
    var filePath = path.join(this.root, filePath);
    if (this._isValidPath(filePath) === false)
        return null;
    return fs.readFileSync(filePath);
};

ExtensionFileSystem.prototype.rename = function(oldPath, newPath) {
    var oldFilePath = path.join(this.root, oldPath);
    var newFilePath = path.join(this.root, newPath);
    if (this._isValidPath(oldFilePath) === false)
        return false;
    if (this._isValidPath(newFilePath) === false)
        return false;
    fs.renameSync(oldFilePath, newFilePath);
    return true;
};

ExtensionFileSystem.prototype.rmdir = function(path) {
    var filePath = path.join(this.root, path);
    if (this._isValidPath(filePath) === false)
        return false;
    fs.rmdir(filePath);
    return true;
};

ExtensionFileSystem.prototype.write = function(fd, buf, count) {
    return fs.writeSync(fd, buf, 0, count, null);
};

ExtensionFileSystem.prototype.writeFile = function(path, buf) {
    var filePath = path.join(this.root, path);
    if (this._isValidPath(filePath) === false)
        return null;
    return fs.writeFileSync(filePath, buf);
};

module.exports = ExtensionFileSystem;
