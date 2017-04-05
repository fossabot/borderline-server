const ObjectID = require('mongodb').ObjectID;
const Timestamp = require('mongodb').Timestamp;

function Steps(workflowCollection, stepCollection) {
    this.workflowCollection = workflowCollection;
    this.stepCollection = stepCollection;
}

Steps.prototype.getAll = function(workflow_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.stepCollection.find({workflow: new ObjectID(workflow_id)}).toArray().then(function(result) {
            if (result === null || result === undefined || result.length === 0)
                resolve([]);
            else
                resolve(result);
        },
        function(error) {
            reject(error);
        })
    });
};

Steps.prototype._graphInsert = function(node, stepData) {
    if (Object.keys(node).length === 0 && node.constructor === Object) {
        return stepData;
    }

    if (node.id == stepData.parent) {
        node.children.push(stepData);
    }

    for (var i = 0; i < node.children.length; i++) {
        node.children[i] = this._graphInsert(node.children[i], stepData);
    }
    return node;
};

Steps.prototype.create = function(workflow_id, step_data) {
    var that = this;
    var time = new Timestamp();
    var stepModel = Object.assign({
        create: time,
        update:time,
        workflow: workflow_id,
    }, step_data);

    return new Promise(function(resolve, reject) {
        that.stepCollection.insertOne(stepModel).then(function (stepResult) {
            that.workflowCollection.findOne({_id: new ObjectID(workflow_id) }).then(function (foundWorkflow) {
                var stepGraph = {
                    id: stepModel._id,
                    parent: step_data.parent,
                    children: []
                };
                foundWorkflow.graph = that._graphInsert(foundWorkflow.graph, stepGraph);
                foundWorkflow.update = time;
                that.workflowCollection.findOneAndReplace({_id: new ObjectID(workflow_id)}, foundWorkflow, {upsert: true}).then(function(updatedWorkflow) {
                    resolve(stepModel);
                }, function(updateError) {
                    reject(updateError);
                });

            }, function (workflowError) {
                reject(workflowError);
            });
        }, function (stepError) {
            reject(stepError);
        });
    });
};

module.exports = Steps;
