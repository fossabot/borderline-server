var path = require('path');

var pluginStoreModule = require('../core/pluginStore');

function PluginStoreController(mongoDBCollection) {
    this.mongoDBCollection = mongoDBCollection;
    this.pluginStore = new pluginStoreModule(this.mongoDBCollection);

    this.getPluginStoreRouter = PluginStoreController.prototype.getPluginStoreRouter.bind(this);
    this.getPluginStore = PluginStoreController.prototype.getPluginStore.bind(this);
    this.postPluginStore = PluginStoreController.prototype.postPluginStore.bind(this);
    this.deletePluginStore = PluginStoreController.prototype.deletePluginStore.bind(this);
    this.getPluginByID = PluginStoreController.prototype.getPluginByID.bind(this);
    this.postPluginByID = PluginStoreController.prototype.postPluginByID.bind(this);
    this.deletePluginByID = PluginStoreController.prototype.deletePluginByID.bind(this);
    this.getPluginStoreUpload = PluginStoreController.prototype.getPluginStoreUpload.bind(this);
    this.getPluginStoreUploadByID = PluginStoreController.prototype.getPluginStoreUploadByID.bind(this);
}


PluginStoreController.prototype.getPluginStoreRouter = function() {
    return this.pluginStore.router;
};

PluginStoreController.prototype.getPluginStore = function(req, res) {
    var plugin_list = this.pluginStore.listPlugins();
    console.log(plugin_list);
    res.status(200);
    res.json({ plugins: plugin_list });
};

PluginStoreController.prototype.postPluginStore = function(req, res) {

    if (typeof req.files === 'undefined' || req.files === null || req.files.length == 0){
        res.status(406);
        res.json({error: 'Zip file upload failed'});
        return;
    }

    var plugins = [];
    for (var i = 0; i < req.files.length; i++) {
        var p = this.pluginStore.createPluginFromFile(req.files[i]);
        plugins.push(p);
    }

    res.status(200);
    res.json(plugins);
};

PluginStoreController.prototype.deletePluginStore = function(req, res) {
    this.pluginStore.clearPlugins();
    res.status(200);
    res.json({ message: 'Removed all server plugins' });
};


PluginStoreController.prototype.getPluginByID = function(req, res) {
    var id = req.params.id;
    var info = this.pluginStore.getPluginInfoById(id);
    if (info !== null) {
        res.status(200);
        res.json(info);
    }
    else {
        res.status(401);
        res.json({error: 'Unknown plugin Id ' +  id });
    }
};

PluginStoreController.prototype.postPluginByID = function(req, res) {
    id = req.params.id;
    if (typeof req.files === 'undefined' || req.files.length == 0) {
        res.status(406);
        res.json({error: 'No file uploaded for plugin ' + id + ' update'});
        return;
    }
    var updateReply = this.pluginStore.updatePluginById(id, req.files[0]);
    if (updateReply.hasOwnProperty('error') == true)
        res.status(401);
    else
        res.status(200);
    res.json(updateReply);
};

PluginStoreController.prototype.deletePluginByID = function(req, res) {
    var id = req.params.id;
    var deleteReply = this.pluginStore.deletePluginById(id);
    if (deleteReply.hasOwnProperty('error') == true)
        res.status(401);
    else
        res.status(200);
    res.json(deleteReply);
};

PluginStoreController.prototype.getPluginStoreUpload = function(req, res, next) {
    res.status(200);
    res.send(
        '<form action="/plugin_store" method="post" enctype="multipart/form-data">'+
        '<input type="file" name="plugin-zip" accept=".zip">'+
        '<input type="submit" value="Upload">'+
        '</form>'
    );
};

PluginStoreController.prototype.getPluginStoreUploadByID = function(req, res, next) {
    var id = req.params.id;
    res.status(200);
    res.send(
        '<form action="/plugin_store/${id}" method="post" enctype="multipart/form-data">'+
        '<input type="file" name="plugin-zip" accept=".zip">'+
        '<input type="submit" value="Upload">'+
        '</form>'
    );
};

module.exports = PluginStoreController;
