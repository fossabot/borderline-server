const ObjectID = require('mongodb').ObjectID;

function Workflows(workflowCollection) {
    this.workflowCollection = workflowCollection;

    this.findAll = Workflows.prototype.findAll.bind(this);
    this.createWorkflow = Workflows.prototype.createWorkflow.bind(this);
    this.updateTimestamp = Workflows.prototype.updateTimestamp.bind(this);
    this.getWorkflowByID = Workflows.prototype.getWorkflowByID.bind(this);
    this.updateWorkflowByID = Workflows.prototype.updateWorkflowByID.bind(this);
    this.deleteWorkflowByID = Workflows.prototype.deleteWorkflowByID.bind(this);
}

Workflows.prototype.findAll = function() {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.workflowCollection.find().toArray().then(function(result) {
            if (result === null || result === undefined || result.length === 0)
                resolve([]);
            else
                resolve(result);
        }, function(error) {
            reject(error);
        });
    });
};

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
            reject(error);
        })
    });
};

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
                   reject(error);
               }
            );
    });
};

Workflows.prototype.getWorkflowByID = function(workflow_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.workflowCollection.findOne({_id: new ObjectID(workflow_id)}).then(function(result) {
            if (result === null || result === undefined)
                reject('No match for workflow with id ' + workflow_id);
            else
                resolve(result);
        }, function(error) {
            reject(error);
        });
    });
};

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
                    reject('Update failed for workflow with id ' + workflow_id);
                else
                    resolve(result.value);
            }, function(error) {
                reject(error);
            });
    });
};

Workflows.prototype.deleteWorkflowByID = function(workflow_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.workflowCollection.findOneAndDelete({_id: new ObjectID(workflow_id)}).then(function(result) {
            if (result === null || result === undefined || result.value === null)
                reject('No match for workflow with id ' + workflow_id);
            else
                resolve(result.value);
        }, function(error) {
            reject(error);
        });
    });
};

module.exports = Workflows;
