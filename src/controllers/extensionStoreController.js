var path = require('path');

var extensionStoreModule = require('../core/extensionStore');

/**
 * @fn ExtensionStoreContrller
 * @param mongoDBCollection Mongo collection where the extension are stored
 * @constructor
 */
function ExtensionStoreController(mongoDBCollection) {
    this.mongoDBCollection = mongoDBCollection;
    this.extensionStore = new extensionStoreModule(this.mongoDBCollection);

    this.getExtensionStoreRouter = ExtensionStoreController.prototype.getExtensionStoreRouter.bind(this);
    this.getExtensionStore = ExtensionStoreController.prototype.getExtensionStore.bind(this);
    this.postExtensionStore = ExtensionStoreController.prototype.postExtensionStore.bind(this);
    this.deleteExtensionStore = ExtensionStoreController.prototype.deleteExtensionStore.bind(this);
    this.getExtensionByID = ExtensionStoreController.prototype.getExtensionByID.bind(this);
    this.postExtensionByID = ExtensionStoreController.prototype.postExtensionByID.bind(this);
    this.deleteExtensionByID = ExtensionStoreController.prototype.deleteExtensionByID.bind(this);
    this.getExtensionStoreUpload = ExtensionStoreController.prototype.getExtensionStoreUpload.bind(this);
    this.getExtensionStoreUploadByID = ExtensionStoreController.prototype.getExtensionStoreUploadByID.bind(this);
}

/**
 * @fn getExtensionStoreRouter
 * @return {Router} Express router where the extension get mounted at
 */
ExtensionStoreController.prototype.getExtensionStoreRouter = function() {
    return this.extensionStore.router;
};

/**
 * @fn geTExtensionStore
 * @desc List all the extensions
 * @param req Express.js request object
 * @param res Express.js response object
 */
ExtensionStoreController.prototype.getExtensionStore = function(req, res) {
    var extension_list = this.extensionStore.listExtensions();
    res.status(200);
    res.json({ extensions: extension_list });
};

/**
 * @fn postExtensionStore
 * @desc Process upload a new extension .zip
 * @param req Express.js request object
 * @param res Express.js response objec
 */
ExtensionStoreController.prototype.postExtensionStore = function(req, res) {

    if (typeof req.files === 'undefined' || req.files === null || req.files.length == 0){
        res.status(406);
        res.json({error: 'Zip file upload failed'});
        return;
    }

    var extensions = [];
    for (var i = 0; i < req.files.length; i++) {
        var p = this.extensionStore.createExtensionFromFile(req.files[i]);
        extensions.push(p);
    }

    res.status(200);
    res.json(extensions);
};

/**
 * @fn deleteExtensionStore
 * @desc Removes all extensions from the store
 * @param req Express.js request object
 * @param res Express.js response object
 */
ExtensionStoreController.prototype.deleteExtensionStore = function(req, res) {
    this.extensionStore.clearExtensions();
    res.status(200);
    res.json({ message: 'Removed all server extensions' });
};

/**
 * @fn getExtensionByID
 * @desc Get an extension from its unique identifier
 * @param req
 * @param res
 */
ExtensionStoreController.prototype.getExtensionByID = function(req, res) {
    var id = req.params.id;
    var info = this.extensionStore.getExtensionInfoById(id);
    if (info !== null) {
        res.status(200);
        res.json(info);
    }
    else {
        res.status(401);
        res.json({error: 'Unknown extension Id ' +  id });
    }
};

/**
 * @fn postExtensionByID
 * @desc Update an extension referenced by ID.
 * The extension in .zip is reassigned to this ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
ExtensionStoreController.prototype.postExtensionByID = function(req, res) {
    var id = req.params.id;
    if (typeof req.files === 'undefined' || req.files.length == 0) {
        res.status(406);
        res.json({error: 'No file uploaded for extension ' + id + ' update'});
        return;
    }
    var updateReply = this.extensionStore.updateExtensionById(id, req.files[0]);
    if (updateReply.hasOwnProperty('error') == true)
        res.status(401);
    else
        res.status(200);
    res.json(updateReply);
};

/**
 * @fn deleteExtensionByID
 * @desc remvoes an extension from the server, referenced by ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
ExtensionStoreController.prototype.deleteExtensionByID = function(req, res) {
    var id = req.params.id;
    var deleteReply = this.extensionStore.deleteExtensionById(id);
    if (deleteReply.hasOwnProperty('error') == true)
        res.status(401);
    else
        res.status(200);
    res.json(deleteReply);
};

/**
 * @fn getExtensionStoreUpload
 * @desc Get the minimal HTML form for a postExtensionStore
 * @param req Express.js request object
 * @param res Express.js response object
 */
ExtensionStoreController.prototype.getExtensionStoreUpload = function(req, res) {
    res.status(200);
    res.send(
        '<form action="/extension_store" method="post" enctype="multipart/form-data">'+
        '<input type="file" name="extension-zip" accept=".zip">'+
        '<input type="submit" value="Upload">'+
        '</form>'
    );
};

/**
 * @fn getExtensionStoreUploadByID
 * @desc Get the minimal HTML form for a postExtensionStoreByID
 * @param req Express.js request object
 * @param res Express.js response object
 */
ExtensionStoreController.prototype.getExtensionStoreUploadByID = function(req, res) {
    var id = req.params.id;
    res.status(200);
    res.send(
        '<form action="/extension_store/${id}" method="post" enctype="multipart/form-data">'+
        '<input type="file" name="extension-zip" accept=".zip">'+
        '<input type="submit" value="Upload">'+
        '</form>'
    );
};

module.exports = ExtensionStoreController;
