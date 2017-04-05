var userExtensionModule = require('../core/userExtensions');

function UserExtensionController(mongoDBCollection) {
    this.extensionCollection = mongoDBCollection;
    this.userExtension = new userExtensionModule(this.extensionCollection);

    this.getExtensions = UserExtensionController.prototype.getExtensions.bind(this);
    this.deleteExtensions = UserExtensionController.prototype.deleteExtensions.bind(this);
    this.subscribeExtension = UserExtensionController.prototype.subscribeExtension.bind(this);
    this.unsubscribeExtension = UserExtensionController.prototype.unsubscribeExtension.bind(this);
}

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
