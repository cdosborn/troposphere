define(function (require) {
  "use strict";

  var Backbone = require('backbone'),
    ApplicationVersion = require('models/ApplicationVersion'),
    globals = require('globals');

  return Backbone.Collection.extend({
    model: ApplicationVersion,

    url: globals.API_V2_ROOT + "/image_version",

    parse: function (response) {
      this.meta = {
        count: response.count,
        next: response.next,
        previous: response.previous
      };

      return response.results;
    },

    comparator: function (a, b) {
      return b.get('start_date').diff(a.get('start_date'), "seconds");
    }

  });

});
