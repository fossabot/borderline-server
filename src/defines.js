function ErrorStack(error_obj, error_stack) {
    var error = {};
    var error_message = '';

    //Extract current error message
    if (typeof error_obj === 'string')
        error_message = error_obj;
    else if (typeof error_obj === 'object' && error_obj.hasOwnProperty('message'))
        error_message = error_obj.message;
    else if (typeof error_obj === 'object' && error_obj.hasOwnProperty('error'))
        error_message = error_obj.error;
    else if (error_obj === undefined || error_obj === null)
        error_message = 'Undefined';
    else
        error_message = error_obj.toString();
    error.error =  error_message;

    //Extract error stack
    if (error_stack === undefined && error_obj.hasOwnProperty('stack'))
        error_stack = error_obj.stack;
    if (error_stack !== undefined) {
        if (error_stack instanceof Error)
            error.stack = { error: error_stack.message };
        else
            error.stack = error_stack;
    }

    return error;
}

module.exports = {
    userCollectionName: 'borderline_server_users',
    workflowCollectionName: 'borderline_server_workflows',
    stepCollectionName: 'borderline_server_steps',
    dataSourcesCollectionName: 'borderline_server_data_sources',
    extensionsCollectionName: 'borderline_server_extensions',
    sessionCollectionName: 'borderline_server_sessions',
    sessionTimeout: 6 * (24 * 60 * 60), // 6 Days
    errorStacker: ErrorStack
};
