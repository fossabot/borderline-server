const fs = require('fs-extra');
const path = require('path');

const dataStoreModule = require('../core/dataStore');
const defines = require('../defines.js');

/**
 * @fn dataStoreController
 * @param mongoDBCollection Colletion where the data sources information are stored
 */
function dataStoreController(mongoDBCollection) {
    this.sourcesCollection = mongoDBCollection;
    this.dataStore = new dataStoreModule(mongoDBCollection);

    this.getDataStore = dataStoreController.prototype.getDataStore.bind(this);
    this.postDataStore = dataStoreController.prototype.postDataStore.bind(this);
    this.getDataStoreByID = dataStoreController.prototype.getDataStoreByID.bind(this);
    this.putDataStoreByID = dataStoreController.prototype.putDataStoreByID.bind(this);
    this.deleteDataStoreByID = dataStoreController.prototype.deleteDataStoreByID.bind(this);
    this.getUserDataSources = dataStoreController.prototype.getUserDataSources.bind(this);
    this.postUserDataSourceByID = dataStoreController.prototype.postUserDataSourceByID.bind(this);
    this.deleteUserDataSourceByID = dataStoreController.prototype.deleteUserDataSourceByID.bind(this);
}


/**
 * @fn getDataStore
 * @desc List all data source on this server
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.getDataStore = function(req, res) {
    this.dataStore.findAll().then(function(result) {
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Failed to list data sources', error));
    });
};


/**
 * @fn postDataStore
 * @desc Update the data sources on this server
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.postDataStore = function(req, res) {
    var data_source = req.body;
    if (data_source === null || data_source === undefined) {
        res.status(401);
        res.json(defines.errorStacker('Cannot create an empty data source'));
        return;
    }
    this.dataStore.createDataSource(data_source).then(function(result) {
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Failed to list data sources', error));
    });
};


/**
 * @fn getDataStoreByID
 * @desc Find the data source referenced by ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.getDataStoreByID = function(req, res) { //GET a single data source
    var source_id = req.params.source_id;
    this.dataStore.getDataSourceByID(source_id).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot get data source by ID: ', error));
    });
};


/**
 * @fn putDataStoreByID
 * @desc Update a data source referenced by ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.putDataStoreByID = function(req, res) {  // PUT Update a single data source
    var source_id = req.params.source_id;
    var data = req.body;

    this.dataStore.updateDataSourceByID(source_id, data).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot update data source by ID', error));
    });
};


/**
 * @fn deleteDataStoreByID
 * @desc Removes a data soruce from the server. identified by its ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.deleteDataStoreByID = function(req, res) {
    var source_id = req.params.source_id;
    this.dataStore.deleteDataSourceByID(source_id).then(function(result){
        res.status(200);
        res.json({deleted: result});
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot delete data source by ID', error));
    });
};


/**
 * @fn getUserDataSources
 * @desc List all data source for a specific user
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.getUserDataSources = function(req, res) {  //GET all user's data sources
    var user_id = req.params.user_id;
    this.dataStore.getDataStoreByUserID(user_id).then(function (result) {
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot get user data sources', error));
    });
};


/**
 * @fn postUserDataSourcesByID
 * @desc Subscribe a user to a data source.
 * Both are referenced by their IDs
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.postUserDataSourceByID = function(req, res) { //POST Subscribe a user to a data source
    var user_id = req.params.user_id;
    var source_id = req.params.source_id;

    if (user_id === undefined || user_id === null || user_id === '') {
        res.status(501);
        res.json(defines.errorStacker('Missing user_id'));
        return;
    }

    if (source_id === undefined || source_id === null || source_id === '') {
        res.status(501);
        res.json(defines.errorStacker('Missing source_id'));
        return;
    }


    this.dataStore.subscribeUserToDataSource(user_id, source_id).then(function(success) {
        res.status(200);
        res.json(success);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot subscribe', error));
    });
};


/**
 * @fn deleteUserDataSourceByID
 * @desc Unsubscribe a user from a data source.
 * Both user and data source are referenced by ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
dataStoreController.prototype.deleteUserDataSourceByID = function(req, res) { //DELETE Unsubscribe user to data source
    var user_id = req.params.user_id;
    var source_id = req.params.source_id;
    this.dataStore.unsubscribeUserFromDataSource(user_id, source_id).then(function(success) {
        res.status(200);
        res.json(success);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot unsubscribe', error));
    });
};

module.exports = dataStoreController;
