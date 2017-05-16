const path = require('path');
const fs = require('fs-extra');
const https = require('https');
const crypto = require('crypto');
const ObjectID = require('mongodb').ObjectID;
const speakeasy = require('speakeasy');
const defines = require('../defines.js');

/**
 * @fn UserAccounts
 * @param userCollection MongoDb collection to sync against
 * @constructor
 */
function UserAccounts(userCollection) {
    this.userCollection = userCollection;

    //Bind member functions
    this.findAll = UserAccounts.prototype.findAll.bind(this);
    this.findByUsernameAndPassword = UserAccounts.prototype.findByUsernameAndPassword.bind(this);
    this.registerExternalByUsernameAndPassword = UserAccounts.prototype.registerExternalByUsernameAndPassword.bind(this);
    this.findById = UserAccounts.prototype.findById.bind(this);
    this.updateById = UserAccounts.prototype.updateById.bind(this);
    this.deleteById = UserAccounts.prototype.deleteById.bind(this);
    this.regenerateSecret = UserAccounts.prototype.regenerateSecret.bind(this);
}

/**
 * @fn findAll
 * @desc Find all the users in the server
 * @return {Promise} Resolves to an array of users on success
 */
UserAccounts.prototype.findAll = function(){
    var that = this;
    return  new Promise(function(resolve, reject) {
        that.userCollection.find().toArray().then(function(result) {
            if (result === null || result === undefined)
                reject(defines.errorStacker('No users ?!'));
            else
                resolve(result);
        }, function(error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn findByUsernameAndPassword
 * @param username A string username
 * @param password A string password
 * @return {Promise} Resolves to the matched user on success
 */
UserAccounts.prototype.findByUsernameAndPassword = function(username, password) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.userCollection.findOne({username: username}).then(function(result) {
            if (result === null || result === undefined) {
                reject(defines.errorStacker('Invalid username/password'));
                return;
            }
            var salt = result.salt || '';
            var hash = crypto.createHmac('sha512', salt);
            hash.update(password);
            var hash_pass = hash.digest('hex');
            if (hash_pass == result.password)
                resolve(result);
            else
                reject(defines.errorStacker('Invalid username/password'));
        },
        function(error) {
            reject(defines.errorStacker(error)); //Fetch local DB here
        });
    });
};

/**
 * @fn registerExternalByUsernameAndPassword
 * @desc Register a new user form an username/password of external source
 * @param username The username on distant source
 * @param password The password on distant source
 * @return {Promise} Resolves to the registered user on success
 */
UserAccounts.prototype.registerExternalByUsernameAndPassword = function(username, password) {
    var that = this;

    return new Promise(function(resolve, reject) {
        //Fetch default external DB here
        //reject('Invalid username/password first time login');

        //Register new Borderline user on success
        var salt = crypto.randomBytes(32).toString('hex').slice(0, 32);
        var hash = crypto.createHmac('sha512', salt);
        hash.update(password);
        var hash_pass = hash.digest('hex');
        var new_user = {
            username: username,
            salt: salt,
            password: hash_pass,
            admin: false,
            secret: speakeasy.generateSecret({ length: 32, name: 'Borderline' })
        };

        //Resolve Promise on DB insert success
        that.userCollection.insertOne(new_user).then(function(result) {
            new_user._id = result.insertedId;
            resolve(new_user);
        }, function(error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn findByID
 * @param id User unique identifier reference
 * @return {Promise} Resolves to the user data on success
 */
UserAccounts.prototype.findById = function(id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.userCollection.findOne({ _id : new ObjectID(id) }).then(function(result) {
            if (result === null || result === undefined)
                reject(defines.errorStacker('No match for id: ' + id));
            else
                resolve(result);
        },
        function (error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn updateByID
 * @param id User identification reference
 * @param data new user data
 * @return {Promise} Resolves to the update user on success
 */
UserAccounts.prototype.updateById = function(id, data) {
    var that = this;
    return new Promise(function(resolve, reject) {
        if (data.hasOwnProperty('_id')) //Transforms ID to mongo ObjectID type
            delete data._id;
        that.userCollection.findOneAndReplace({ _id : new ObjectID(id) }, data).then(function(result) {
                if (result === null || result === undefined)
                    reject(defines.errorStacker('No match for id: ' + id));
                else
                    resolve(result);
            },
            function (error) {
                reject(defines.errorStacker(error));
            });
    });
};

/**
 * @fn deleteById
 * @desc Removes a user from the server
 * @param id User unique identifier to
 * @return {Promise} Resolve to the removed user on success
 */
UserAccounts.prototype.deleteById = function(id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.userCollection.findOneAndDelete({ _id : new ObjectID(id) }).then(function(result) {
            resolve(result.value);
        }, function (error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn regenerateSecret
 * @desc Regenerate the OAuth tokens and hashes for a user
 * @param id reference to the user by its unique identifier
 * @return {Promise} Resolves to the update user on success
 */
UserAccounts.prototype.regenerateSecret = function(id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.findById(id).then(
            function (user) {
                user.secret = speakeasy.generateSecret({ length: 32, name: 'Borderline' });
                that.updateById(id, user).then(function (result) {
                    resolve(user);
                },
                function (error) {
                    reject(defines.errorStacker('Update user with new secret failed', error));
                });
            },
            function (error) {
                reject(defines.errorStacker('Generate secret failed', error));
            }
        );
    });
};

module.exports = UserAccounts;
