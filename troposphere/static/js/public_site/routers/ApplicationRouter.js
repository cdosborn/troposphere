define(function (require) {
    'use strict';

    var Marionette                   = require('marionette'),
        Root                         = require('components/Root.react'),
        React                        = require('react'),
        context                      = require('context'),
        ApplicationListView          = require('components/applications/list/ApplicationListView.react'),
        ApplicationDetailsPage       = require('components/applications/ApplicationDetailsPage.react'),
        ApplicationSearchResultsPage = require('components/applications/ApplicationSearchResultsPage.react'),
        Backbone                     = require('backbone');

    var Router = Marionette.AppRouter.extend({
      appRoutes: {
        '': 'showApplications',
        'images': 'showApplications',
        'images/:id': 'showApplicationDetails',
        'images/search/:query': 'showApplicationSearchResults',
        '*path': 'defaultRoute'
      }
    });

    var Controller = Marionette.Controller.extend({

      render: function (content, route) {
        var app = Root({
          session: context.session,
          profile: context.profile,
          content: content,
          route: route || Backbone.history.getFragment()
        });
        React.renderComponent(app, document.getElementById('application'));
      },

      //
      // Route handlers
      //

      defaultRoute: function () {
        Backbone.history.navigate('', {trigger: true});
      },

      showApplications: function () {
        this.render(ApplicationListView(), ["images"]);
      },

      showApplicationDetails: function (appId) {
        var content = ApplicationDetailsPage({
          applicationId: appId
        });
        this.render(content, ["images"]);
      },

      showApplicationSearchResults: function (query) {
        var content = ApplicationSearchResultsPage({
          query: query
        });
        this.render(content, ["images", "search"]);
      }

    });

    return {
      start: function () {
        var controller = new Controller();
        var router = new Router({
          controller: controller
        });
      }
    }

  });
