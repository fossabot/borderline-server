const ObjectID = require('mongodb').ObjectID;

function UserExtensions(extensionCollection) {
    this.extensionCollection = extensionCollection;

    this.listExtensions = UserExtensions.prototype.listExtensions.bind(this);
    this.clearExtensions = UserExtensions.prototype.clearExtensions.bind(this);
    this.subscribe = UserExtensions.prototype.subscribe.bind(this);
    this.unsubscribe = UserExtensions.prototype.unsubscribe.bind(this);
}

UserExtensions.prototype.listExtensions = function(user_id) {
    var that = this;
    return new Promise(function (resolve, reject) {
        that.extensionCollection.find({ users: [ new ObjectID(user_id) ] }).toArray().then(
            function (result) {
                resolve(result);
            },
            function (error) {
                reject('List error: ' + error.toString());
            }
        );
    });
};

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
                    reject('Clear extensions subs error: ' + error.toString());
                }
            );
    });
};

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
                        reject('Invalid user_id or extension_id');
                        return;
                    }
                    if (success.modifiedCount == 0) {
                        reject('Already subscribed');
                        return;
                    }
                    resolve(success);
                },
                function(error) {
                    reject('Extension subscribe error: ' + error.toString());
                }
            );
    });
};


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
                        reject('Invalid user_id or extension_id');
                        return;
                    }
                    if (success.modifiedCount == 0) {
                        reject('Already subscribed');
                        return;
                    }
                    resolve(success);
                },
                function(error) {
                    reject('Extension subscribe error: ' + error.toString());
                }
            );
    });
};

module.exports = UserExtensions;
