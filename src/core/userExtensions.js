const ObjectID = require('mongodb').ObjectID;
const defines = require('../defines.js');

/**
 * @fn userExtensions
 * @param extensionCollection MongoDb collection to sync against
 * @constructor
 */
function UserExtensions(extensionCollection) {
    this.extensionCollection = extensionCollection;

    //Bind member functions
    this.listExtensions = UserExtensions.prototype.listExtensions.bind(this);
    this.clearExtensions = UserExtensions.prototype.clearExtensions.bind(this);
    this.subscribe = UserExtensions.prototype.subscribe.bind(this);
    this.unsubscribe = UserExtensions.prototype.unsubscribe.bind(this);
}

/**
 * @fn listExtensions
 * @desc Get all the extension for a user
 * @param user_id A reference to the user
 * @return {Promise} Resolves to an array on this user's extensions
 */
UserExtensions.prototype.listExtensions = function(user_id) {
    var that = this;
    return new Promise(function (resolve, reject) {
        that.extensionCollection.find({ users: [ new ObjectID(user_id) ] }).toArray().then(
            function (result) {
                resolve(result);
            },
            function (error) {
                reject(defines.errorStacker('List error', error));
            }
        );
    });
};

/**
 * @fn clearExtensions
 * @desc Removes all extensions for a specific user
 * @param user_id A reference to the targeted user
 * @return {Promise} Resolves to the updated user on success
 */
UserExtensions.prototype.clearExtensions = function(user_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.extensionCollection.updateMany(
            { _id: new ObjectID(user_id) },
            {
                $pull: {
                    users: new ObjectID(user_id)
                }
            })
            .then(
                function(success) {
                    resolve(success);
                },
                function(error) {
                    reject(defines.errorStacker('Clear extensions subs error', error));
                }
            );
    });
};

/**
 * @fn subscribe
 * @desc Subscribe a user to an extension
 * @param user_id A reference to the user
 * @param extension_id A reference to the extension
 * @return {Promise} Resolves to the update extension on success
 */
UserExtensions.prototype.subscribe = function(user_id, extension_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.extensionCollection.updateOne(
            { _id: extension_id },
            {
                $addToSet: {
                    users: new ObjectID(user_id)
                }
            })
            .then(
                function(success) {
                    if (success.matchedCount == 0) {
                        reject(defines.errorStacker('Invalid user_id or extension_id'));
                        return;
                    }
                    if (success.modifiedCount == 0) {
                        reject(defines.errorStacker('Already subscribed'));
                        return;
                    }
                    resolve(success);
                },
                function(error) {
                    reject(defines.errorStacker('Extension subscribe error', error));
                }
            );
    });
};

/**
 * @fn unsubscribe
 * @desc Removes the user extension dependency
 * @param user_id A reference to the user
 * @param extension_id A reference to the extension
 * @return {Promise} Resolves to the update extension on success
 */
UserExtensions.prototype.unsubscribe = function(user_id, extension_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.extensionCollection.updateOne(
            { _id: extension_id },
            {
                $pull: {
                    users: new ObjectID(user_id)
                }
            })
            .then(
                function(success) {
                    if (success.matchedCount == 0) {
                        reject(defines.errorStacker('Invalid user_id or extension_id'));
                        return;
                    }
                    if (success.modifiedCount == 0) {
                        reject(defines.errorStacker('Already subscribed'));
                        return;
                    }
                    resolve(success);
                },
                function(error) {
                    reject(defines.errorStacker('Extension subscribe error', error));
                }
            );
    });
};

module.exports = UserExtensions;
