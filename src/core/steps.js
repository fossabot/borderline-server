const ObjectID = require('mongodb').ObjectID;
const defines = require('../defines.js');

/**
 * @fn Steps
 * @desc Management of the workflows steps
 * @param workflowCollection Mongo collection where the workflow are stored
 * @param stepCollection Mongo collection where the steps are stored
 * @constructor
 */
function Steps(workflowCollection, stepCollection) {
    this.workflowCollection = workflowCollection;
    this.stepCollection = stepCollection;

    //Bind member functions
    this.getAll = Steps.prototype.getAll.bind(this);
    this._graphInsert = Steps.prototype._graphInsert.bind(this);
    this.create = Steps.prototype.create.bind(this);
    this.getByID = Steps.prototype.getByID.bind(this);
    this.updateByID = Steps.prototype.updateByID.bind(this);
    this.deleteByID = Steps.prototype.deleteByID.bind(this);
}

/**
 * @fn getAll
 * @desc Retrieves all the step for a workflow
 * @param workflow_id A reference to the workflow
 * @return {Promise} Resolves to an array of steps on success
 */
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

/**
 * @fn _graphInsert
 * @param node Graph node object to insert under
 * @param stepData Data to insert
 * @private
 */
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

/**
 * @fn create
 * @param workflow_id Workflow reference to create into
 * @param step_data step to create and insert
 * @return {Promise} Resolve to the created step
 */
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
                    reject(defines.errorStacker('Create step update error', updateError));
                });

            }, function (workflowError) {
                reject(defines.errorStacker('Create step workflow error', workflowError));
            });
        }, function (stepError) {
            reject(defines.errorStacker('Create step step error', stepError));
        });
    });
};

/**
 * @fn getByID
 * @desc Find a step from its unique identifier
 * @param step_id Reference to the step to get
 * @return {Promise} Resolves to the step data on success
 */
Steps.prototype.getByID = function(step_id) {
    var that = this;
    return new Promise(function(resolve, reject) {
        that.stepCollection.findOne({_id: new ObjectID(step_id)}).then(function (success) {
            if (success === null || success === undefined) {
                reject(defines.errorStacker('Unknown step with id ' + step_id));
            }
            else {
                resolve(success);
            }
        }, function (error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn updateByID
 * @param step_id A reference to the step targeted
 * @param step_data The new step data
 * @return {Promise} Returns the updated object on success
 */
Steps.prototype.updateByID = function(step_id, step_data) {
    var that = this;
    var time = new Date();

    return new Promise(function(resolve, reject) {
        delete step_data._id;
        delete step_data.create;
        step_data.update = time;
        that.stepCollection.findOneAndUpdate({_id: new ObjectID(step_id)}, {$set: step_data}, {returnOriginal: false}).then(function (success) {
            if (success === null || success === undefined || success.value === null || success.value === undefined) {
                reject(defines.errorStacker('Unknown step with id ' + step_id));
            }
            else {
                resolve(success.value);
            }
        }, function (error) {
            reject(defines.errorStacker(error));
        });
    });
};

/**
 * @fn deleteByID
 * @desc Removes a step
 * @param step_id The step unique identifier to remove
 * @return {Promise} Resolves to the deleted step on success
 */
Steps.prototype.deleteByID = function(step_id) {
  var that = this;

  return new Promise(function(resolve, reject) {
      that.stepCollection.findOneAndDelete({ _id: new ObjectID(step_id) }).then(function (success) {
          if (success === null || success === undefined || success.value === null || success.value === undefined) {
              reject(defines.errorStacker('Unknown step with id ' + step_id));
          }
          else {
              resolve(success);
          }
      }, function (error) {
          reject(defines.errorStacker(error));
      });
  });
};

module.exports = Steps;
