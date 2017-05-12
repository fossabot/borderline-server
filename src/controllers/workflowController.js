const workflowModule = require('../core/workflows.js');
const stepModule = require('../core/steps.js');
const defines = require('../defines.js');

/**
 * @fn workflowContainer
 * @desc Controller for workflow and step routes
 * @param mongoDBCollection_workflow Collection where the workflow are stored
 * @param mongoDBCollection_step Collection where the steps are stored
 */
function workflowController(mongoDBCollection_workflow, mongoDBCollection_step) {
    this.workflowCollection = mongoDBCollection_workflow;
    this.stepCollection = mongoDBCollection_step;

    this.workflow = new workflowModule(mongoDBCollection_workflow);
    this.step = new stepModule(mongoDBCollection_workflow, mongoDBCollection_step);

    this.getWorkflow = workflowController.prototype.getWorkflow.bind(this);
    this.putWorkflow = workflowController.prototype.putWorkflow.bind(this);
    this.getWorkflowByID = workflowController.prototype.getWorkflowByID.bind(this);
    this.postWorkflowByID = workflowController.prototype.postWorkflowByID.bind(this);
    this.deleteWorkflowByID = workflowController.prototype.deleteWorkflowByID.bind(this);
    this.getStep = workflowController.prototype.getStep.bind(this);
    this.putStep = workflowController.prototype.putStep.bind(this);
    this.getStepByID = workflowController.prototype.getStepByID.bind(this);
    this.postStepByID = workflowController.prototype.postStepByID.bind(this);
    this.deleteStepByID = workflowController.prototype.deleteStepByID.bind(this);
}

/**
 * @fn getWorkflow
 * @desc List all workflow on this server
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.getWorkflow = function(req, res) {
    this.workflow.findAll().then(function(result) {
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Failed to list workflows', error));
    });
};

/**
 * @fn putWorkflow
 * @desc Create a new workflow
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.putWorkflow = function(req, res) {
    var data = req.body;
    if (data === null || data === undefined) {
        res.status(401);
        res.json(defines.errorStacker('Cannot create an empty workflow'));
        return;
    }

    data.user = req.user ? req.user._id : null;
    data.name = data.name ? data.name : 'DefaultWorkflowName';
    if (data.user === null || data.user === undefined) {
        res.status(403);
        res.json(defines.errorStacker('Cannot create a workflow outside a session'));
        return;
    }

    this.workflow.createWorkflow(data).then(function(result) {
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(501);
        res.json(defines.errorStacker('Failed to create workflow', error));
    });
};

/**
 * @fn getWorkflowByID
 * @desc Get a workflow from ID string
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.getWorkflowByID = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.workflow.getWorkflowByID(workflow_id).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot get workflow by ID',  error));
    });
};

/**
 * @fn postWorkflowByID
 * @desc Update a workflow identified by ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.postWorkflowByID = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.workflow.updateWorkflowByID(workflow_id, req.body).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot update workflow by ID', error));
    });
};

/**
 * @fn deleteWorkflowByID
 * @desc Delete a workflow referenced by ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.deleteWorkflowByID = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.workflow.deleteWorkflowByID(workflow_id).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json(defines.errorStacker('Cannot delete workflow by ID', error));
    });
};

/**
 * @fn getStep
 * @desc List all steps wihtin a workflow
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.getStep = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.step.getAll(workflow_id).then(function(result) {
       res.status(200);
       res.json(result);
    },
    function(error){
        res.status(404);
        res.json(defines.errorStacker('Listing workflow steps failed', error));
    });
};

/**
 * @fn putStep
 * @desc Create a step within a workflow
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.putStep = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.step.create(workflow_id, req.body).then(function(result) {
        res.status(200);
        res.json(result);
    }, function(error){
        res.status(401);
        res.json(defines.errorStacker('Creating workflow step failed', error));
    });
};

/**
 * @fn getStepById
 * @desc Get a step referenced by ID
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.getStepByID = function(req, res) {
    var step_id = req.params.step_id;
    this.step.getByID(step_id).then(function (result) {
        res.status(200);
        res.json(result);
    }, function (error) {
       res.status(401);
       res.json(defines.errorStacker('Cannot get step', error));
    });
};

/**
 * @fn postStepByID
 * @desc Update a step referenced by ID. Update propagates to container workflow
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.postStepByID = function(req, res){
    var workflow_id = req.params.workflow_id;
    var step_id = req.params.step_id;
    var step_data = req.body;
    var that = this;
    this.step.updateByID(step_id, step_data).then(function (step_result) {
        that.workflow.updateTimestamp(workflow_id).then(function(workflow_result) {
            res.status(200);
            res.json(step_result);
        }, function(workflow_error) {
            res.status(401);
            res.json(defines.errorStacker('Logging update in workflow failed', workflow_error));
        });
    }, function (step_error) {
        res.status(401);
        res.json(defines.errorStacker('Update step operation failed', step_error));
    });
};

/**
 * @fn deleteStepByID
 * @desc Removes a step. Update propagates through the parent workflow
 * @param req Express.js request object
 * @param res Express.js response object
 */
workflowController.prototype.deleteStepByID = function(req, res) {
    var step_id = req.params.step_id;
    var workflow_id = req.params.workflow_id;
    var that = this;
    this.step.deleteByID(step_id).then(function (result) {
        that.workflow.updateTimestamp(workflow_id).then(function(workflow_result) {
            res.status(200);
            res.json(result);
        }, function(workflow_error) {
            res.status(401);
            res.json(defines.errorStacker('Logging delete in workflow failed', workflow_error));
        });
    }, function (error) {
        res.status(401);
        res.json(defines.errorStacker('Delete step operation failed', error));
    });
};

module.exports = workflowController;
