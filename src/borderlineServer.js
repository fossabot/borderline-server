//External node module imports
const mongodb = require('mongodb').MongoClient;
const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const expressSession = require('express-session');
const MongoStore = require('connect-mongo')(expressSession);
const body_parser = require('body-parser');
const passport = require('passport');
const multer  = require('multer');
const timer= require('timers');
const ip = require('ip');

const borderlineOptions = require('./core/options');
const defines = require('./defines.js');
const package = require('../package.json');

function BorderlineServer(config) {
    this.config = new borderlineOptions(config);
    this.app = express();

    //Configuration import
    global.config = this.config;

    //Bind member functions
    this._connectDb = BorderlineServer.prototype._connectDb.bind(this);
    this._registryHandler = BorderlineServer.prototype._registryHandler.bind(this);
    this.mongoError = BorderlineServer.prototype.mongoError.bind(this);
    this.extensionError = BorderlineServer.prototype.extensionError.bind(this);
    this.setupUserAccount = BorderlineServer.prototype.setupUserAccount.bind(this);
    this.setupDataStore = BorderlineServer.prototype.setupDataStore.bind(this);
    this.setupExtensionStore = BorderlineServer.prototype.setupExtensionStore.bind(this);
    this.setupUserExtensions = BorderlineServer.prototype.setupUserExtensions.bind(this);
    this.setupWorkflows = BorderlineServer.prototype.setupWorkflows.bind(this);

    //Remove unwanted express headers
    this.app.set('x-powered-by', false);
    //Allow CORS requests when enabled
    if (this.config.enableCors === true) {
        this.app.use(function (req, res, next) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            next();
        });
    }

    var _this = this;
    this._connectDb().then(function() {
        //Middleware imports
        _this.userPermissionsMiddleware = require('./middlewares/userPermissions');

        //Init external middleware
        _this.app.use(body_parser.urlencoded({extended: true}));
        _this.app.use(body_parser.json());
        _this.app.use(expressSession({
            secret: 'borderline',
            saveUninitialized: false,
            resave: false,
            cookie: {secure: false},
            store: _this.mongoStore
        }));
        _this.app.use(passport.initialize());
        _this.app.use(passport.session());

        //Setup route using controllers
        _this.setupUserAccount();
        _this.setupDataStore();
        _this.setupExtensionStore();
        _this.setupUserExtensions();
        _this.setupWorkflows();

        //Setup Registry update
        _this._registryHandler();
    }, function(error) {
        this.mongoError(error.toString());
    });

    return this.app;
}

/**
 * @fn _registryHandler
 * @desc Setup a routine to update the global registry
 * Put a status object in the DB based on this current configuration
 * @private
 */
BorderlineServer.prototype._registryHandler = function() {
    var _this = this;

    //Connect to the registry collection
    this.registry = this.db.collection(defines.globalRegistryCollectionName);
    var registry_update = function() {
        //Create status object
        var status = Object.assign({}, defines.registryModel, {
            type: 'borderline-server',
            version: package.version,
            timestamp: new Date(),
            port: _this.config.port,
            ip: ip.address().toString()
        });
        //Write in DB
        //Match by ip + port + type
        //Create if does not exists.
        _this.registry.findOneAndReplace({
            ip: status.ip,
            port: status.port,
            type: status.type
        }, status, { upsert: true, returnOriginal: false })
            .then(function(success) {
                //Nothing to do here
            }, function(error) {
                //Just log the error
                // console.log(error);
            });
    };

    //Call the update every X milliseconds
    var interval_timer = timer.setInterval(registry_update, defines.registryUpdateInterval);
    //Do a first update now
    registry_update();

    return interval_timer;
};


/**
 * @fn _connectDb
 * @desc Setup the connections with mongoDB
 * @return {Promise} Resolves to true on success
 * @private
 */
BorderlineServer.prototype._connectDb = function() {
    var _this = this;
    return new Promise(function(resolve, reject) {
        mongodb.connect(this.config.mongoUrl, function (err, db) {
            if (err !== null) {
                reject('Failed to connect to mongoDB');
                return;
            }
            _this.db = db;
            _this.mongoStore = new MongoStore({db: db, ttl: defines.sessionTimeout, collection: defines.sessionCollectionName });
            resolve(true);
        });
    });
};

/**
 * @fn setupUserAccount
 * @desc Initialize users account management routes and controller
 */
BorderlineServer.prototype.setupUserAccount = function() {
    //Controller imports
    var userAccountController = require('./controllers/userAccountController');
    this.userAccountController = new userAccountController(this.db.collection(defines.userCollectionName));

    //Passport session serialize and deserialize
    passport.serializeUser(this.userAccountController.serializeUser);
    passport.deserializeUser(this.userAccountController.deserializeUser);

    //[ Login and sessions Routes
    //TEMPORARY getter on login form
    this.app.get('/login/form', this.userAccountController.getLoginForm); //GET login form

    this.app.route('/login')
        .post(this.userAccountController.login); //POST login information
    this.app.route('/logout')
        .post(this.userAccountController.logout); //POST logout from session
    this.app.route('/whoami')
        .get(this.userAccountController.whoAmI); //GET current session user
    this.app.route('/2step/:user_id/')
        .put(this.userAccountController.put2step); //PUT regenerate secret
    this.app.route('/2step/login')
        .post(this.userAccountController.login2); //POST login with 2 step ON
    this.app.route('/users')
        .get(this.userPermissionsMiddleware.adminPrivileges, this.userAccountController.getUsers);//GET returns the list of users
    this.app.route('/users/:user_id')
        .get(this.userAccountController.getUserById) //GET user details by ID
        .post(this.userAccountController.postUserById) //POST Update user details
        .delete(this.userAccountController.deleteUserById); //DELETE Removes a user
    // ] Login and sessions routes
};

/**
 * @fn setupDataStore
 * @desc Initialize data sources management routes and controller
 */
BorderlineServer.prototype.setupDataStore = function() {
    // Data sources controller import
    var dataStoreControllerModule = require('./controllers/dataStoreController');
    this.dataStoreController = new dataStoreControllerModule(this.db.collection(defines.dataSourcesCollectionName));

    //[ Data sources routes
    this.app.route('/data_sources/')
        .get(this.dataStoreController.getDataStore) // GET all data sources
        .post(this.dataStoreController.postDataStore);//POST New data source
    this.app.route('/data_sources/:source_id')
        .get(this.dataStoreController.getDataStoreByID) //GET a single data source
        .put(this.dataStoreController.putDataStoreByID) // PUT Update a single data source
        .delete(this.dataStoreController.deleteDataStoreByID); //DELETE a single data source
    this.app.route('/users/:user_id/data_sources')
        .get(this.dataStoreController.getUserDataSources); //GET all user's data sources
    this.app.route('/users/:user_id/data_sources/:source_id')
        .post(this.dataStoreController.postUserDataSourceByID) //POST Subscribe a user to a data source
        .delete(this.dataStoreController.deleteUserDataSourceByID); //DELETE Unsubscribe user to data source
    // ] Data sources routes
};

/**
 * @fn setupExtensionStore
 * @desc Initialize global extensions management routes and controller
 */
BorderlineServer.prototype.setupExtensionStore = function() {
    if (this.config.hasOwnProperty('extensionSourcesFolder') == false) {
        this.extensionError('No extensionSourcesFolder in options');
        return;
    }
    if (fs.existsSync(this.config.extensionSourcesFolder) == false) {
        this.extensionError('Directory ' + this.config.extensionSourcesFolder + ' not found');
        return;
    }

    var extensionStoreController = require('./controllers/extensionStoreController');
    this.extensionStoreController = new extensionStoreController(this.db.collection(defines.extensionsCollectionName));

    // [ Extension Store Routes
    //TEMPORARY getter on a form to upload extensions zip file
    this.app.get('/extension_store/upload', this.extensionStoreController.getExtensionStoreUpload);
    //TEMPORARY getter on a form to update extensions zip file
    this.app.get('/extension_store/upload/:id', this.extensionStoreController.getExtensionStoreUploadByID);

    this.app.use('/extensions', this.extensionStoreController.getExtensionStoreRouter()); //Extensions routers connect here
    this.app.route('/extension_store')
        .get(this.extensionStoreController.getExtensionStore) //GET returns the list of available extensions
        .post(multer().any(), this.extensionStoreController.postExtensionStore) //POST upload a new extension
        .delete(this.userPermissionsMiddleware.adminPrivileges, this.extensionStoreController.deleteExtensionStore); //DELETE clears all the extensions
    this.app.route('/extension_store/:id')
        .get(this.extensionStoreController.getExtensionByID) //:id GET returns extension metadata
        .post(multer().any(), this.extensionStoreController.postExtensionByID) //:id POST update a extension content
        .delete(this.extensionStoreController.deleteExtensionByID); //:id DELETE removes a specific extension
    // ] Extension Store Routes
};

/**
 * @fn setupUserExtensions
 * @desc Initialize users extensions management routes and controller
 */
BorderlineServer.prototype.setupUserExtensions = function() {
    var userExtensionControllerModule = require('./controllers/userExtensionController');
    this.userExtensionController = new userExtensionControllerModule(this.db.collection(defines.extensionsCollectionName));

     //[ Extensions subscriptions
    this.app.route('/users/:user_id/extensions')
        .get(this.userExtensionController.getExtensions) //GET List user extensions
        .delete(this.userExtensionController.deleteExtensions); //DELETE Forget all extensions for user
    this.app.route('/users/:user_id/extensions/:extension_id')
        .put(this.userExtensionController.subscribeExtension) //PUT Subscribe a user to extension
        .delete(this.userExtensionController.unsubscribeExtension); //DELETE Un-subscribe from a extension
    //] Extensions subs
};

/**
 * @fn setupWorkflows
 * @desc Initialize workflow management routes and controller
 */
BorderlineServer.prototype.setupWorkflows = function() {
    var workflowControllerModule = require('./controllers/workflowController');
    this.workflowController = new workflowControllerModule(this.db.collection(defines.workflowCollectionName), this.db.collection(defines.stepCollectionName));

    //[ Workflow endpoints
    this.app.route('/workflow')
        .get(this.workflowController.getWorkflow) //GET List all workflow
        .put(this.workflowController.putWorkflow); //PUT Create a new workflow
    this.app.route('/workflow/:workflow_id')
        .get(this.workflowController.getWorkflowByID) //GET A workflow from ID
        .post(this.workflowController.postWorkflowByID) //POST a workflow from ID
        .delete(this.workflowController.deleteWorkflowByID); //DELETE a workflow from ID
    this.app.route('/workflow/:workflow_id/step')
        .get(this.workflowController.getStep) //GET A workflow steps from workflow ID
        .put(this.workflowController.putStep);//PUT A new workflow step from workflow ID
   this.app.route('/workflow/:workflow_id/step/:step_id')
        .get(this.workflowController.getStepByID) //GET A step by ID from a workflow by ID
        .post(this.workflowController.postStepByID) //POST A step by ID in a Workflow by ID
        .delete(this.workflowController.deleteStepByID); //DELETE a step by ID in a workflow by ID
    // ] Workflow endpoints
};

/**
 * @fn mongoError
 * @desc Disables every routes of the app to send back an error message
 * @param message A message string to use in responses
 */
BorderlineServer.prototype.mongoError = function(message) {
    this.app.all('*', function(req, res) {
        res.status(401);
        res.json({ error: 'Could not connect to the database: [' + message + ']' });
    });
};

/**
 * @fn extensionsError
 * @desc Disables extension routes to send error message instead
 * @param message A message string to use in responses
 */
BorderlineServer.prototype.extensionError = function(message) {
    this.app.all('/extension_store', function(req, res) {
        res.status(204);
        res.json({ error: 'Extension store is disabled: [' + message + ']' });
    });
    this.app.all('/extensions/*', function(req, res) {
        res.status(204);
        res.json({ error: 'Extensions are disabled: [' + message + ']'});
    });
};

module.exports = BorderlineServer;
