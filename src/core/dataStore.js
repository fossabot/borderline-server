const fs = require('fs-extra');
const path = require('path');
const ObjectID = require('mongodb').ObjectID;
const defines = require('../defines.js');

/**
 * @fn dataStore
 * @desc Data store manipulation methods
 * @param dataStoreCollection MongoDB collection to sync against
 */
function dataStore(dataStoreCollection) {
    this.sourcesCollection = dataStoreCollection;


    //Bind member functions
    this.findAll = dataStore.prototype.findAll.bind(this);
    this.createDataSource = dataStore.prototype.createDataSource.bind(this);
    this.getDataSourceByID = dataStore.prototype.getDataSourceByID.bind(this);
    this.updateDataSourceByID = dataStore.prototype.updateDataSourceByID.bind(this);
    this.deleteDataSourceByID = dataStore.prototype.deleteDataSourceByID.bind(this);
    this.getDataStoreByUserID = dataStore.prototype.getDataStoreByUserID.bind(this);
    this.subscribeUserToDataSource = dataStore.prototype.subscribeUserToDataSource.bind(this);
    this.unsubscribeUserFromDataSource = dataStore.prototype.unsubscribeUserFromDataSource.bind(this);
}

/**
 * @fn findAll
 * @desc Find all data source in this instance
 * @return {Promise} Resolve to an array containing the data sources
 */
dataStore.prototype.findAll = function() {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.sourcesCollection.find().toArray().then(function(result) {
            if (result === null || result === undefined || result.length === 0)
                resolve([]);
            else
                resolve(result);
        }, function(error) {
            reject(defines.errorStacker('Find operation failed', error));
        });
    });
};

/**
 * @fn createDataSource
 * @param data_source JSON object for a data source
 * @return {Promise} Resolve to the inserted data source on success
 */
dataStore.prototype.createDataSource = function(data_source) {
    var that = this;
    return new Promise(function(resolve, reject) {
        for (var i = 0; i < data_source.users.length; i++) {
            data_source.users[i] = new ObjectID(data_source.users[i]);
        }
        that.sourcesCollection.insertOne(data_source).then(function(success) {
            if (success.insertedCount == 1) {
                resolve(success.ops[0]);
            }
            else {
                reject(defines.errorStacker('Did not manage to register a new data source'));
            }
        }, function(error) {
            reject(defines.errorStacker('New data source insert operation failed', error));
        });
    });
};

/**
 * @fn getDataSourceByID
 * @desc Retrieve a data source form its unique identifier
 * @param source_id The reference ID to the data source
 * @return {Promise} Resolves to the data source on success
 */
dataStore.prototype.getDataSourceByID = function(source_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.sourcesCollection.findOne({_id: new ObjectID(source_id) }).then(function(result) {
            if (result === null || result === undefined)
                reject(defines.errorStacker('No match for id: ' + source_id));
            else
                resolve(result);
        }, function(error) {
           reject(defines.errorStacker('Find data source by ID failed', error));
        });
    });
};

/**
 * @fn updateDataSourceByID
 * @param source_id The reference ID to the data source
 * @param data The new Data source content
 * @return {Promise} Resolves to the update data source on success
 */
dataStore.prototype.updateDataSourceByID = function(source_id, data) {
    var that = this;
    return new Promise(function(resolve, reject) {
        if (data.hasOwnProperty('_id')) //Transforms ID to mongo ObjectID type
            delete data._id;
        for (var i = 0; i < data.users; i++) {
            data.users[i] = new ObjectID(data.users[i]);
        }
        that.sourcesCollection.findOneAndReplace({_id: new ObjectID(source_id) }, data).then(function(result) {
            if (result === null || result === undefined)
                reject(defines.errorStacker('No match for id: ' + source_id));
            else {
                data._id = result.value._id;
                resolve(data);
            }
        }, function(error) {
            reject(defines.errorStacker('Update datasource failed', error));
        });
    });
};

/**
 * @fn deleteDataSourceByID
 * @desc Removes a data source from th e server
 * @param source_id The reference ID to the data source
 * @return {Promise} Resolves to the deleted data source on success
 */
dataStore.prototype.deleteDataSourceByID = function(source_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.sourcesCollection.findOneAndDelete({_id: new ObjectID(source_id)}).then(function (result) {
            resolve(result.value);
        }, function (error) {
            reject(defines.errorStacker('Delete a data source fail', error));
        });
    });
};

/**
 * @fn getDataStoreByUserID
 * @desc List all data source for a specific user
 * @param user_id User referenced by its unique identifier
 * @return {Promise} Resolve to an array of data sources on success
 */
dataStore.prototype.getDataStoreByUserID = function(user_id) {
    var that = this;
    return  new Promise(function(resolve, reject) {
        that.sourcesCollection.find({ users: new ObjectID(user_id) }).toArray().then(function(result) {
            resolve(result);
        }, function(error) {
            reject(defines.errorStacker('Get data sources by user fails', error));
        });
    });
};

/**
 * @fn subscribeUserToDataSource
 * @desc Flags a user as using a data source
 * @param user_id User referenced by its unique identifier
 * @param source_id The reference ID to the data source
 * @return {Promise} Resolves to the update data source on success
 */
dataStore.prototype.subscribeUserToDataSource = function(user_id, source_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.sourcesCollection.updateOne({ _id: new ObjectID(source_id) },
                                         {
                                             $addToSet: {
                                                 users: new ObjectID(user_id)
                                             }
                                         })
            .then(function(success) {
                if (success.matchedCount == 0) {
                    reject(defines.errorStacker('Invalid user_id or source_id'));
                    return;
                }
                if (success.modifiedCount == 0) {
                    reject(defines.errorStacker('Already subscribed'));
                    return;
                }
                resolve(success);
            }, function(error) {
                reject(defines.errorStacker('Subscribe failed to save', error));
            }
            );
    });
};

/**
 * @fn unsubscribeUserFromDataSource
 * @desc Removes a user subscription to a data source
 * @param user_id User referenced by its unique identifier
 * @param source_id The reference ID to the data source
 * @return {Promise} Resolves to the update data source on success
 */
dataStore.prototype.unsubscribeUserFromDataSource = function(user_id, source_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.sourcesCollection.updateOne({ _id: new ObjectID(source_id) },
            {
                $pull: {
                    users: new ObjectID(user_id)
                }
            })
            .then(function(success) {
                if (success.matchedCount == 0) {
                    reject(defines.errorStacker('Invalid user_id or source_id'));
                    return;
                }
                if (success.modifiedCount == 0) {
                    reject(defines.errorStacker('Was not subscribed'));
                    return;
                }
                resolve(success);
            }, function(error) {
                reject(defines.errorStacker('Unsubscribe failed to save', error));
            });
    });
};

module.exports = dataStore;
