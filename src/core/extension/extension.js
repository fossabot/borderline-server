const express = require('express');
const fs = require('fs-extra');
const path = require('path');

const borderlineApiModule = require('./api');

function Extension(ExtensionPath) {
    this.extensionPath = ExtensionPath;
    this.manifest = fs.readJsonSync(path.join(ExtensionPath, 'plugin.json'));
    this.router = express.Router();
    this.uuid = this.manifest.id;

    this.container = null;
    this.borderlineApi = new borderlineApiModule(this.manifest.id);

    //Importing the Extension
    this.container = this.webpackImporter(ExtensionPath);
    if (this.container === null || this.container === undefined) { //Fallback for dev
        this.container = this.importer(ExtensionPath);
    }

    this.attach = Extension.prototype.attach.bind(this);
    this.detach = Extension.prototype.detach.bind(this);
    this.infos = Extension.prototype.info.bind(this);
}

Extension.prototype.info = function() {
    return this.manifest;
};

Extension.prototype.webpackImporter = function(importPath) {
    try {

        if (this.manifest.hasOwnProperty('server.js') == false || this.manifest.hasOwnProperty('client.js') == false)
            return null;

        var serverFile = path.join(importPath, this.manifest['server.js']);
        var clientFile = path.join(importPath, this.manifest['client.js']);

        if (fs.existsSync(serverFile) === true) {
            //Read server module form filesystem
            var code = fs.readFileSync(serverFile);
            //Define borderline in local scope so its found during eval
            var borderline = this.borderlineApi;
            //Evaluate server extension Code
            var imported = eval(code.toString());

            //Create extension container object
            var extension = Object.assign({
                compiled: true,
                serverFile: serverFile,
                clientFile: clientFile,
                extensionPath: importPath,
                serverModule: new imported()
            });

            return extension; //Success
        }
    }
    catch (err) {
        console.error('Webpack extension import failed: ' + err);
        return null;
    }
    return null;
};

Extension.prototype.importer = function(importPath) {
    var serverFile = path.join(importPath, 'server.js');
    var clientFile = path.join(importPath, 'client.js');

    var mod = {};
    try {
        if (fs.existsSync(clientFile) === false)
            clientFile = null;

        if (fs.existsSync(serverFile) === true) {
            //Read server module form filesystem
            var code = fs.readFileSync(serverFile);

            var code_pre = '(function (borderline, module, __filename, __directory) { ';
            var code_post = '});';

            //Evaluate server extension Code
            var imported = eval(code_pre + code + code_post);

            //Instanciate server module with boderline context
            imported(this.borderlineApi, mod, 'index.js', importPath);

            //Create extension container object
            var extension = {
                compiled: false,
                serverFile: serverFile,
                clientFile: clientFile,
                extensionPath: importPath,
                serverModule: new mod.exports()
            };
            return extension; //Success
        }
    }
    catch (err) {
        console.error('Classic extension import failed: ' + err);
        return null;
    }
    return null;
};

Extension.prototype.attach = function() {
    var that = this;

    if (this.container) { //Dynamic extension features
        if (this.container.serverModule) {
            this.container.serverModule.attach(this.router);
        }
        if (this.container.clientFile) {
            this.router.get('/client', function (req, res) {
                return res.sendFile(that.container.clientFile);
            });
        }
    }

    //Server all the other static files
    this.router.get('/*', function(req, res) {

        //Defaults to index.html
        var url = req.params[0];
        if (req.params[0] === null || req.params[0] === undefined || req.params[0].length === 0) {
            url = 'index.html';
        }

        var resourcePath = that.extensionPath + '/' + url;
        if (resourcePath.indexOf('..') === -1 && fs.existsSync(resourcePath) === true) {
            return res.sendFile(resourcePath);
        }
        res.status(404);
        res.json({ error: 'Unresolved extension internal path /' + url } );
    });
};

Extension.prototype.detach = function() {
    if (this.container && this.container.serverModule) {
        this.container.serverModule.detach();
    }
};

module.exports = Extension;
