const defines = require('../defines.js');

/**
 * @fn adminPrivileges
 * @desc Check for admin privileges calls down the chain
 * if the current user is an admin, hooks the request otherwise
 * @param req Express.js request object
 * @param res Express.js response object
 * @param next Express.js handler function chain
 */
module.exports.adminPrivileges = function(req, res, next) {
    if (req.user && req.user.admin === true) {
        next();
        return;
    }
    res.status(403);
    res.json(defines.errorStacker('Permission denied'));
};

/**
 * @fn userPrivileges
 * @desc Check the user targeted by this request.
 * calls down the chain if the user session matches, hooks the request otherwise
 * @param req Express.js request object
 * @param res Express.js response object
 * @param next Express.js handler function chain
 */
module.exports.userPrivileges = function(req, res, next) {
    if (req.user && req.user.id === req.params.user_id) {
        next();
        return;
    }
    res.status(403);
    res.json(defines.errorStacker('Permission denied'));
};

/**
 * @fn userPrivileges
 * @desc Check the user targeted by this request.
 * calls down the chain if the user session matches, hooks the request otherwise
 * Also allows for admins to perform the request
 * @param req Express.js request object
 * @param res Express.js response object
 * @param next Express.js handler function chain
 */
module.exports.userOrAdminPrivileges = function(req, res, next) {
  if (req.user && req.user.id === req.params.user_id) {
      next();
      return;
  }
  if (req.user && req.user.admin === true) {
      next();
      return;
  }
  res.status(403);
  res.json(defines.errorStacker('Permission denied'));
};
