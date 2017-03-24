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

const borderlineOptions = require('./core/options');

function BorderlineServer(config) {
    this.config = new borderlineOptions(config);
    this.app = express();

    this.mongoError = BorderlineServer.prototype.mongoError.bind(this);
    this.pluginError = BorderlineServer.prototype.pluginError.bind(this);

    this.setupUserAccount = BorderlineServer.prototype.setupUserAccount.bind(this);
    this.setupDataStore = BorderlineServer.prototype.setupDataStore.bind(this);
    this.setupPluginStore = BorderlineServer.prototype.setupPluginStore.bind(this);
    this.setupUserPlugins = BorderlineServer.prototype.setupUserPlugins.bind(this);

    //Configuration import
    global.config = this.config;

    if (this.config.hasOwnProperty('mongoUrl') == false) {
        this.mongoError('No mongoUrl provided');
        return this.app;
    }

    var that = this;
    mongodb.connect(global.config.mongoUrl, function(err, db) {
        if (err !== null) {
            that.mongoError(err.toString());
            return that.app;
        }
        that.db = db;
        that.mongoStore = new MongoStore({ db: that.db, ttl: 6 * (24 * 60 * 60) });

        //Middleware imports
        that.userPermissionsMiddleware = require('./middlewares/userPermissions');

        //Init external middleware

        that.app.use(body_parser.urlencoded({ extended: true }));
        that.app.use(body_parser.json());
        that.app.use(expressSession({ secret: 'borderline', saveUninitialized: false, resave: false ,  cookie: { secure: false }, store: that.mongoStore } ));
        that.app.use(passport.initialize());
        that.app.use(passport.session());

        //Setup route using controllers
        that.setupUserAccount();
        that.setupDataStore();
        that.setupPluginStore();
        that.setupUserPlugins();

        //Remove unwanted express headers
        that.app.set('x-powered-by', false);
    });

    return this.app;
}


BorderlineServer.prototype.setupUserAccount = function() {
    //Controller imports
    var userAccountController = require('./controllers/userAccountController');
    this.userAccountController = new userAccountController(this.db.collection('users'));

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

BorderlineServer.prototype.setupDataStore = function(){
    // Data sources controller import
    var dataStoreControllerModule = require('./controllers/dataStoreController');
    this.dataStoreController = new dataStoreControllerModule(this.db.collection('data_sources'));

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

BorderlineServer.prototype.setupPluginStore = function() {
    if (this.config.hasOwnProperty('pluginSourcesFolder') == false) {
        this.pluginError('No pluginSourcesFolder in options');
        return;
    }
    if (fs.existsSync(this.config.pluginSourcesFolder) == false) {
        this.pluginError('Directory ' + this.config.pluginSourcesFolder + ' not found');
        return;
    }

    var pluginStoreController = require('./controllers/pluginStoreController');
    this.pluginStoreController = new pluginStoreController(this.db.collection('plugins'));

    // [ Plugin Store Routes
    //TEMPORARY getter on a form to upload plugins zip file
    this.app.get('/plugin_store/upload', this.pluginStoreController.getPluginStoreUpload);
    //TEMPORARY getter on a form to update plugins zip file
    this.app.get('/plugin_store/upload/:id', this.pluginStoreController.getPluginStoreUploadByID);

    this.app.use('/plugins', this.pluginStoreController.getPluginStoreRouter()); //Plugins routers connect here
    this.app.route('/plugin_store')
        .get(this.pluginStoreController.getPluginStore) //GET returns the list of available plugins
        .post(multer().any(), this.pluginStoreController.postPluginStore) //POST upload a new plugin
        .delete(this.userPermissionsMiddleware.adminPrivileges, this.pluginStoreController.deletePluginStore); //DELETE clears all the plugins
    this.app.route('/plugin_store/:id')
        .get(this.pluginStoreController.getPluginByID) //:id GET returns plugin metadata
        .post(multer().any(), this.pluginStoreController.postPluginByID) //:id POST update a plugin content
        .delete(this.pluginStoreController.deletePluginByID); //:id DELETE removes a specific plugin
    // ] Plugin Store Routes
};

BorderlineServer.prototype.setupUserPlugins = function() {
    var userPluginControllerModule = require('./controllers/userPluginController');
    this.userPluginController = new userPluginControllerModule(this.db.collection('plugins'));

     //[ Plugins subscriptions
    this.app.route('/users/:user_id/plugins')
        .get(this.userPluginController.getPlugins) //GET List user plugins
        .delete(this.userPluginController.deletePlugins); //DELETE Forget all plugins for user
    this.app.route('/users/:user_id/plugins/:plugin_id')
        .put(this.userPluginController.subscribePlugin) //PUT Subscribe a user to plugin
        .delete(this.userPluginController.unsubscribePlugin); //DELETE Un-subscribe from a plugin
    //] Plugins subs
};

BorderlineServer.prototype.mongoError = function(message) {
    this.app.all('*', function(req, res) {
        res.status(401);
        res.json({ error: 'Could not connect to the database: [' + message + ']' });
    });
};

BorderlineServer.prototype.pluginError = function(message) {
    this.app.all('/plugin_store', function(req, res) {
        res.status(204);
        res.json({ error: 'Plugin store is disabled: [' + message + ']' });
    });
    this.app.all('/plugins/*', function(req, res) {
        res.status(204);
        res.json({ error: 'Plugins are disabled: [' + message + ']'});
    });
};

module.exports = BorderlineServer;
