//External modules
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const zlib = require('zlib');
const adm_zip = require('adm-zip');

//Local modules
var Plugin = require('./plugin/plugin');

var PluginStore = function(pluginCollection) {
    this.plugins = [];
    this.pluginFolder = path.normalize(global.config.pluginSourcesFolder);
    this.pluginCollection = pluginCollection;
    this.router = express.Router();

    this._scanLocalFolder();
    if (global.config.development == true) {
        this._watchLocalFolder();
    }
    this._scanDatabase();
};

PluginStore.prototype._scanDatabase = function() {
    var that = this;
    this.pluginCollection.find().toArray().then(function(results) {
        for (var i = 0; i < results.length; i++) {
            if (that._findPluginById(results[i]._id) === null) {
                that._syncPlugin({ uuid: results[i]._id }, 'disable');
            }
        }
    });
};

PluginStore.prototype._syncPlugin = function(plugin, operation) {
    var that = this;
    operation =  typeof operation !== 'undefined' ? operation : 'update';
    var info = JSON.parse(JSON.stringify(plugin.manifest));
    delete info['server.js'];
    delete info['client.js'];
    delete info['id'];
    var model = Object.assign( {
        users: plugin.users ? plugin.users : [],
        enabled: true
    }, info);

    return new Promise(function(resolve, reject) {
        var sync_success = function(success) { resolve(success); };
        var sync_error = function(error) { reject(error); };

        if (operation === 'update' || operation === 'create') {
            that.pluginCollection.findOneAndReplace({_id: plugin.uuid}, model, {upsert: true})
                .then(sync_success, sync_error);
        }
        else if (operation === 'disable') {
            that.pluginCollection.findOneAndUpdate({ _id: plugin.uuid }, { $set: { enabled: false } })
                .then(sync_success, sync_error);
        }
        else if (operation === 'enable') {
            that.pluginCollection.findOneAndUpdate({ _id: plugin.uuid }, { $set: { enabled: true } })
                .then(sync_success, sync_error);
        }
        else if (operation === 'delete' ) {
            that.pluginCollection.findOneAndDelete({ _id: plugin.uuid })
                .then(sync_success, sync_error);
        }
        else {
            reject('Undefined plugin sync operation: ' + operation);
        }
    });
};


PluginStore.prototype._attachPlugin = function(plugin) {
    plugin.attach();
    this.router.use('/' + plugin.uuid, plugin.router);
};

PluginStore.prototype._detachPlugin = function(plugin) {
    plugin.detach();
    if (Array.isArray(this.router.stack)) {
        var pluginRoot = '/' + plugin.uuid;
        var index = this.router.stack.findIndex(function (layer) {
            if (layer.name === 'router' && pluginRoot.match(layer.regexp)) {
                return true;
            }
        });
        if (index !== -1) {
            this.router.stack.splice(index, 1);
            return true;
        }
    }
    return false;
};

PluginStore.prototype._findPluginById = function(id) {
    for (var i = 0; i < this.plugins.length; i++) {
        if (this.plugins[i].uuid === id)
            return this.plugins[i];
    }
    return null;
};

PluginStore.prototype._watchLocalFolder = function() {
    var that = this;
    fs.watch(this.pluginFolder,
            {
                recursive: true,
                encoding: 'utf8',
                persistent: true
            },
            function(eventType, filename) {
                if (!filename)
                    return;
                var re = /(\/|\\)/;
                var pluginDirectory = filename.split(re);
                if (pluginDirectory && pluginDirectory.length > 0) {
                    var folder = pluginDirectory[0];
                    var pluginPath = path.join(that.pluginFolder, folder);
                    var manifest = fs.readJsonSync(path.join(pluginPath, 'plugin.json'));
                    var p = that._findPluginById(manifest.id);
                    if (p !== null) {
                        that._detachPlugin(p);
                        that.plugins.splice(that.plugins.findIndex(function(p) { return p.uuid == manifest.id }), 1);
                        if (fs.existsSync(pluginPath)) {
                            var new_plugin = new Plugin(pluginPath);
                            that._attachPlugin(new_plugin);
                            that.plugins.push(new_plugin);
                            that._syncPlugin(new_plugin, 'update');
                        }
                    }
                    else {
                        if (fs.existsSync(pluginPath)) {
                            var new_plugin = new Plugin(pluginPath);
                            that._attachPlugin(new_plugin);
                            that.plugins.push(new_plugin);
                            that._syncPlugin(new_plugin, 'create');
                        }
                    }
                }
            }
    );
};

PluginStore.prototype._scanLocalFolder = function() {
    var dir_content = fs.readdirSync( this.pluginFolder );
    var that = this;

    dir_content.forEach(function(f) {
        var file = path.join(that.pluginFolder, f);
        var file_fd = fs.openSync(file, 'r');
        var file_stats = fs.fstatSync(file_fd);
        if (file_stats.isDirectory()) {
            var plugin = new Plugin(file);
            that._attachPlugin(plugin);
            that.plugins.push(plugin);
            that._syncPlugin(plugin, 'update');
        }
    });
};

PluginStore.prototype.listPlugins = function() {
    return this.plugins;
};

PluginStore.prototype.createPluginFromFile = function(file) {
    var that = this;
    var buf = Buffer.from(file.buffer);
    var zip = new adm_zip(buf);

    //Find required manifest file
    var manifest = null;
    zip.getEntries().forEach(function (entry) {
        if (entry.name === 'plugin.json')
            manifest = entry;
    });

    if (manifest === null) {
        return { error: 'Missing mandatory plugin manifest plugin.js' };
    }
    manifest = JSON.parse(manifest.getData());
    if (manifest === null || manifest.hasOwnProperty('id') == false) {
        return { error: 'Corrupted plugin manifest plugin.js' };
    }

    //Generate a non-colliding plugin UUID
    while (that._findPluginById(manifest.id) !== null)
        manifest.id = Math.floor(Math.random() * 0xffffffffffff).toString(16);

    zip.extractAllTo(that.pluginFolder, true);

    var packageFolder = path.join(that.pluginFolder, manifest.name + '-' + manifest.version);

    //overwrite manifest ofter extraction for non colliding ids
    fs.writeJsonSync(path.join(packageFolder, './plugin.json'), manifest);

    var new_plugin = new Plugin(packageFolder);
    that.plugins.push(new_plugin);
    that._attachPlugin(new_plugin);

    return {id: manifest.id};
};

PluginStore.prototype.clearPlugins = function() {
    var that = this;
    this.plugins.forEach(function(plugin) {
        //Disconnect routes
        that._detachPlugin(plugin);
        //Remove local directory
        fs.removeSync(path.join(that.pluginFolder, './' + plugin.manifest.name + '-' + plugin.manifest.version));
        //Remove from DB
        that._syncPlugin(plugin, 'delete');
    });
    this.plugins = [];
};

PluginStore.prototype.getPluginInfoById = function(id) {
    var  p = this._findPluginById(id);
    if (p !== null)
        return p.infos();
    return null;
};

PluginStore.prototype.deletePluginById = function(uuid) {
    var res = { error: 'Cannot delete plugin with ID ' + uuid };

    var p = this._findPluginById(uuid);
    if (p !== null) {
        if (this._detachPlugin(p) === true) {
            //Remove from DB
            this._syncPlugin(p, 'delete');
            //Remove from array
            this.plugins.splice(this.plugins.findIndex(function(p) { return p.uuid == uuid }), 1);
            //Remove local directory
            fs.removeSync(this.pluginFolder + '/' + uuid);
            res = {id: uuid};
        }
        else {
            res = { error: 'Detaching the plugin failed. ID ' + uuid };
        }
    }
    return res;
};

PluginStore.prototype.updatePluginById = function(uuid, file) {
    var buf = Buffer.from(file.buffer);
    var zip = new adm_zip(buf);

    if (zip.getEntry('plugin.json') === null) {
        return { error: 'Missing mandatory plugin manifest plugin.js' };
    }

    var delReply = this.deletePluginById(uuid);
    if (delReply.hasOwnProperty('error')) {
        return {error: 'Cannot update unknown plugin ID: ' + uuid };
    }

    zip.extractAllTo(this.pluginFolder + '/' + uuid, true);

    var new_plugin = new Plugin(uuid, this.pluginFolder + '/' + uuid);
    this._attachPlugin(new_plugin);
    this.plugins.push(new_plugin);
    //Insert in DB
    this._syncPlugin(new_plugin, 'create');

    return {id : uuid};
};


module.exports = PluginStore;
