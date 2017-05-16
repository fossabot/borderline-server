const ObjectID = require('mongodb').ObjectID;
const defines = require('../defines.js');

/**
 * @fn Workflows
 * @param workflowCollection MongoDb collection to sync against
 * @constructor
 */
function Workflows(workflowCollection) {
    this.workflowCollection = workflowCollection;

    this.findAll = Workflows.prototype.findAll.bind(this);
    this.createWorkflow = Workflows.prototype.createWorkflow.bind(this);
    this.updateTimestamp = Workflows.prototype.updateTimestamp.bind(this);
    this.getWorkflowByID = Workflows.prototype.getWorkflowByID.bind(this);
    this.updateWorkflowByID = Workflows.prototype.updateWorkflowByID.bind(this);
    this.deleteWorkflowByID = Workflows.prototype.deleteWorkflowByID.bind(this);
}

/**
 * @fn findAll
 * @desc Find all workflows on the server
 * @return {Promise} Resolves to an array of workflows on success
 */
Workflows.prototype.findAll = function() {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.workflowCollection.find().toArray().then(function(result) {
            if (result === null || result === undefined || result.length === 0)
                resolve([]);
            else
                resolve(result);
        }, function(error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn createWorkflow
 * @param data JSON object describing the workflow
 * @return {Promise} Resolve to the create workflow
 */
Workflows.prototype.createWorkflow = function(data) {
    var that = this;

    var time = new Date();
    var workflowModel = {
        name: data.name,
        create: time,
        update: time,
        owner: data.user,
        read: [],
        write: [],
        graph: {}
    };
    return new Promise(function(resolve, reject) {
        that.workflowCollection.insertOne(workflowModel).then(function(success) {
            resolve(workflowModel);
        },
        function(error) {
            reject(defines.errorStacker(error));
        })
    });
};

/**
 * @fn updateTimestamp
 * @param workflow_id A reference to some workflow
 * @return {Promise} Resolves to the updated workflow
 */
Workflows.prototype.updateTimestamp = function(workflow_id) {
    var that = this;
    var time = new Date();
    return new Promise(function(resolve, reject) {
       that.workflowCollection.findOneAndUpdate(
           {_id: new ObjectID(workflow_id) },
           { $set: {update: time} },
           { returnOriginal: false }).then(
               function(success) {
                   resolve(success);
               }, function (error) {
                   reject(defines.errorStacker(error));
               }
            );
    });
};

/**
 * @fn getWorkflowByID
 * @desc Retrieves a workflow from its unique identifier
 * @param workflow_id The reference to te workflow
 * @return {Promise} Resolves to the workflow on success
 */
Workflows.prototype.getWorkflowByID = function(workflow_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.workflowCollection.findOne({_id: new ObjectID(workflow_id)}).then(function(result) {
            if (result === null || result === undefined)
                reject('No match for workflow with id ' + workflow_id);
            else
                resolve(result);
        }, function(error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn updateWorkflowByID
 * @param workflow_id The unique identifier of the workflow to update
 * @param data The new workflow content
 * @return {Promise} Resolve to the update workflow on success
 */
Workflows.prototype.updateWorkflowByID = function(workflow_id, data) {
    var that = this;
    var time = new Date();
    return new Promise(function(resolve, reject) {
        delete data._id;
        delete data.create;
        data.update = time;
        that.workflowCollection.findOneAndUpdate({_id: new ObjectID(workflow_id)}, { $set: data}, { returnOriginal: false })
            .then(function(result) {
                if (result === null || result === undefined)
                    reject(defines.errorStacker('Update failed for workflow with id ' + workflow_id));
                else
                    resolve(result.value);
            }, function(error) {
                reject(defines.errorStacker(error));
            });
    });
};

/**
 * @fn deleteWorkflowByID
 * @desc Removes a workflow from the server
 * @param workflow_id The reference unique identifier to the workflow
 * @return {Promise} Resolves to the deelted workflow on success
 */
Workflows.prototype.deleteWorkflowByID = function(workflow_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.workflowCollection.findOneAndDelete({_id: new ObjectID(workflow_id)}).then(function(result) {
            if (result === null || result === undefined || result.value === null)
                reject(defines.errorStacker('No match for workflow with id ' + workflow_id));
            else
                resolve(result.value);
        }, function(error) {
            reject(defines.errorStacker(error));
        });
    });
};

module.exports = Workflows;
