define(function (require) {

  var Utils = require('./Utils'),
      Router = require('../Router'),
      Constants = require('constants/QuotaRequestConstants'),
      QuotaRequest = require('models/QuotaRequest');

  return {
    update: function(params) {
      var request = params.request,
          response = params.response,
          quota = params.quota,
          status = params.status;

      var newAttributes = {
        admin_message: response,
        quota: quota,
        status: status
      };

      request.set(newAttributes);
      Router.getInstance().transitionTo("admin");
      request.save(newAttributes, {patch: true}).done(function() {
        Utils.dispatch(Constants.UPDATE, {model: request});
        Utils.dispatch(Constants.REMOVE, {model: request});
      });
    }
  };

});
