define(function (require) {
  'use strict';

  var TagConstants = require('constants/TagConstants'),
      Tag = require('models/Tag'),
      actions = require('actions'),
      Utils = require('../Utils');

  return {

    create_AddToInstance: function(params){

      if(!params.name) throw new Error("Missing name");
      if(!params.description) throw new Error("Missing description");
      if(!params.instance) throw new Error("Missing instance");

      var name = params.name,
          instance = params.instance,
          description = params.description;

      var tag = new Tag({
        name: name,
        description: description
      });

      // Add the tag optimistically
      Utils.dispatch(TagConstants.ADD_TAG, {tag: tag}, {silent: false});

      tag.save().done(function () {
        Utils.dispatch(TagConstants.UPDATE_TAG, {tag: tag}, {silent: false});
        Utils.dispatch(TagConstants.REMOVE_PENDING_TAG_FROM_INSTANCE, {tag: tag, instance: instance});
        actions.InstanceTagActions.add({
          instance: instance,
          tag: tag
        });
      }).fail(function () {
        Utils.dispatch(TagConstants.REMOVE_TAG, {tag: tag}, {silent: false});
        Utils.dispatch(TagConstants.REMOVE_PENDING_TAG_FROM_INSTANCE, {tag: tag, instance: instance});
      });

      Utils.dispatch(TagConstants.ADD_PENDING_TAG_TO_INSTANCE, {tag: tag, instance: instance});

    }

  };

});
