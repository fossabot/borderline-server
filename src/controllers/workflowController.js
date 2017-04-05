const workflowModule = require('../core/workflows.js');
const stepModule = require('../core/steps.js');

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
}


workflowController.prototype.getWorkflow = function(req, res) {
    this.workflow.findAll().then(function(result) {
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json({ error: 'Failed to list workflows: ' + error });
    });
};

workflowController.prototype.putWorkflow = function(req, res) {
    var data = req.body;
    if (data === null || data === undefined) {
        res.status(401);
        res.json({ error: 'Cannot create an empty workflow'});
        return;
    }

    data.user = req.user ? req.user._id : null;
    data.name = data.name ? data.name : 'DefaultWorkflowName';
    if (data.user === null || data.user === undefined) {
        res.status(403);
        res.json({ error: 'Cannot create a workflow with no owner, please login'});
        return;
    }

    this.workflow.createWorkflow(data).then(function(result) {
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(501);
        res.json({ error: 'Failed to create workflow: ' + error });
    });
};

workflowController.prototype.getWorkflowByID = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.workflow.getWorkflowByID(workflow_id).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json({ error: 'Cannot get workflow by ID: ' + error });
    });
};

workflowController.prototype.postWorkflowByID = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.workflow.updateWorkflowByID(workflow_id, req.body).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json({ error: 'Cannot update workflow by ID: ' + error });
    });
};


workflowController.prototype.deleteWorkflowByID = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.workflow.deleteWorkflowByID(workflow_id).then(function(result){
        res.status(200);
        res.json(result);
    }, function(error) {
        res.status(401);
        res.json({ error: 'Cannot delete workflow by ID: ' + error });
    });
};

workflowController.prototype.getStep = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.step.getAll(workflow_id).then(function(result) {
       res.status(200);
       res.json(result);
    },
    function(error){
        res.status(404);
        res.json({ error: 'Listing workflow steps failed: ' + error });
    });
};

workflowController.prototype.putStep = function(req, res) {
    var workflow_id = req.params.workflow_id;
    this.step.create(workflow_id, req.body).then(function(result) {
            res.status(200);
            res.json(result);
        },
        function(error){
            res.status(401);
            res.json({ error: 'Creating workflow step failed: ' + error });
        });
};

module.exports = workflowController;
