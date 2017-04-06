const ObjectID = require('mongodb').ObjectID;

function Steps(workflowCollection, stepCollection) {
    this.workflowCollection = workflowCollection;
    this.stepCollection = stepCollection;

    this.getAll = Steps.prototype.getAll.bind(this);
    this._graphInsert = Steps.prototype._graphInsert.bind(this);
    this.create = Steps.prototype.create.bind(this);
    this.getByID = Steps.prototype.getByID.bind(this);
    this.updateByID = Steps.prototype.updateByID.bind(this);
    this.deleteByID = Steps.prototype.deleteByID.bind(this);
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
    var time = new Date();
    var stepModel = Object.assign({
        create: time,
        update: time,
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

Steps.prototype.getByID = function(step_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.stepCollection.findOne({_id: new ObjectID(step_id)}).then(function (success) {
            if (success === null || success === undefined) {
                reject('Unknown step with id ' + step_id);
            }
            else {
                resolve(success);
            }
        }, function (error) {
            reject(error);
        });
    });
};

Steps.prototype.updateByID = function(step_id, step_data) {
    var that = this;
    var time = new Date();

    return new Promise(function(resolve, reject) {
        delete step_data._id;
        delete step_data.create;
        step_data.update = time;
        that.stepCollection.findOneAndUpdate({_id: new ObjectID(step_id)}, {$set: step_data}, {returnOriginal: false}).then(function (success) {
            if (success === null || success === undefined || success.value === null || success.value === undefined) {
                reject('Unknown step with id ' + step_id);
            }
            else {
                resolve(success.value);
            }
        }, function (error) {
            reject(error);
        });
    });
};

Steps.prototype.deleteByID = function(step_id) {
  var that = this;

  return new Promise(function(resolve, reject) {
      that.stepCollection.findOneAndDelete({ _id: new ObjectID(step_id) }).then(function (success) {
          if (success === null || success === undefined || success.value === null || success.value === undefined) {
              reject('Unknown step with id ' + step_id);
          }
          else {
              resolve(success);
          }
      }, function (error) {
          reject(error);
      });
  });
};

module.exports = Steps;
