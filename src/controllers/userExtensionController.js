var userExtensionModule = require('../core/userExtensions');

/**
 * @fn UserExtensionController
 * @desc Controller to manage the users extensions subscriptions
 * @param mongoDBCollection MongoDB collection where the extension are stored
 * @constructor
 */
function UserExtensionController(mongoDBCollection) {
    this.extensionCollection = mongoDBCollection;
    this.userExtension = new userExtensionModule(this.extensionCollection);

    this.getExtensions = UserExtensionController.prototype.getExtensions.bind(this);
    this.deleteExtensions = UserExtensionController.prototype.deleteExtensions.bind(this);
    this.subscribeExtension = UserExtensionController.prototype.subscribeExtension.bind(this);
    this.unsubscribeExtension = UserExtensionController.prototype.unsubscribeExtension.bind(this);
}

/**
 * @fn getExtensions
 * @desc List all extensions for a user referenced by its ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
UserExtensionController.prototype.getExtensions = function(req, res) {
    var user_id = req.params.user_id;
    this.userExtension.listExtensions(user_id).then(function (list) {
        res.status(200);
        res.json(list);
    },
    function (error) {
        res.status(501);
        res.json({ error: 'Cannot list extension for ' + user_id + ' user ID ' + error });
    });
};

/**
 * @fn deleteExtensions
 * @desc Clear all extensions of a user referenced by its unique identifier
 * @param req Express.js request object
 * @param res Express.js response object
 */
UserExtensionController.prototype.deleteExtensions = function(req, res) {
    var user_id = req.params.user_id;
    this.userExtension.clearExtensions(user_id).then(function (success) {
        res.status(200);
        res.json({ success: success });
    },
    function (error) {
        res.status(501);
        res.json({ error: 'Cannot erase user extensions' + error.toString()});
    });
};

/**
 * @fn subscribeExtension
 * @desc Subscribe a user referenced by its ID to a extension referenced by its ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
UserExtensionController.prototype.subscribeExtension = function(req, res) {
    var user_id = req.params.user_id;
    var extension_id = req.params.extension_id;
    this.userExtension.subscribe(user_id, extension_id).then(
        function(success) {
            res.status(200);
            res.json({ success: success });
        },
        function (error) {
            res.status(501);
            res.json({ error: 'Cannot register user extension: ' + error });
        }
    );
};

/**
 * @fn unsubscribeExtensions
 * @desc Unsubscribe a user referenced by its ID from a extension referenced by its ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
UserExtensionController.prototype.unsubscribeExtension = function(req, res) {
    var user_id = req.params.user_id;
    var extension_id = req.params.extension_id;
    this.userExtension.unsubscribe(user_id, extension_id).then(
        function(success) {
            res.status(200);
            res.json({ success: success });
        },
        function (error) {
            res.status(501);
            res.json({ error: 'Cannot remove user extension: ' + error });
        }
    );
};

module.exports = UserExtensionController;
