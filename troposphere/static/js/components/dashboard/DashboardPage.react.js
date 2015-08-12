define(function (require) {
  "use strict";

  var React = require('react'),
    Backbone = require('backbone'),
    InstanceHistoryList = require('./InstanceHistoryList.react'),
    MaintenanceMessageList = require('./MaintenanceMessageList.react'),
    ResourceStatusSummaryPlot = require('./plots/ResourceStatusSummaryPlot.react'),
    ProviderSummaryLinePlot = require('./plots/ProviderSummaryLinePlot.react'),
    CallToAction = require('./CallToAction.react'),
    modals = require('modals'),
    stores = require('stores');
    // images
    var launch_instance = require("images/icon_launchnewinstance.png"),
        settings = require("images/icon_settings.png"),
        help = require("images/icon_gethelp.png");

  return React.createClass({
    renderRequestMoreResources: function (e) {
      e.preventDefault();
      modals.HelpModals.requestMoreResources();
    },

    render: function () {

      var providers = stores.ProviderStore.getAll(),
        identities = stores.IdentityStore.getAll(),
        projects = stores.ProjectStore.getAll(),
        maintenanceMessages = stores.MaintenanceMessageStore.getAll(),
        applications = stores.ApplicationStore.getAll(),
        instances = stores.InstanceStore.getAll(),
        volumes = stores.VolumeStore.getAll(),
        sizes = stores.SizeStore.getAll();

      if (!providers || !identities || !projects || !maintenanceMessages || !applications || !instances || !volumes || !sizes) {
        return <div className='loading'></div>;
      }

      return (
        <div id="dashboard-view">
          <div className="container">
            <div className="row">

              <div className="col-md-9">

                <h2>Getting Started</h2>

                <div className="row calls-to-action">
                  <div className="col-md-3 col-sm-4">
                    <CallToAction
                      title="Launch New Instance"
                      image={launch_instance}
                      description="Browse Atmosphere's list of available images and select one to launch a new instance."
                      linksTo="images"
                      />
                  </div>
                  <div className="col-md-3 col-sm-4">
                    <CallToAction
                      title="Browse Help Resources"
                      image={help}
                      description="View a video tutorial, read the how-to guides, or email the Atmosphere support team."
                      linksTo="help"
                      />
                  </div>
                  <div className="col-md-3 col-sm-4">
                    <CallToAction
                      title="Change Your Settings"
                      image={settings}
                      description="Modify your account settings, view your resource quota, or request more resources."
                      linksTo="settings"
                      />
                  </div>
                </div>

                <div className="resource-header">
                  Resources in Use<a href="#" onClick={this.renderRequestMoreResources}>Need
                  more{String.fromCharCode(63)}</a>
                </div>
                <div className="row">
                  <div className="col-md-8">
                    <ProviderSummaryLinePlot
                      providers={providers}
                      identities={identities}
                      instances={instances}
                      volumes={volumes}
                      sizes={sizes}
                      />
                  </div>
                  <div className="col-md-4">
                    <ResourceStatusSummaryPlot
                      title="Instances"
                      resources={instances}
                      />
                    <ResourceStatusSummaryPlot
                      title="Volumes"
                      resources={volumes}
                      />
                  </div>
                </div>
                <InstanceHistoryList/>
              </div>

              <div className="col-md-3 community-activity">
                <h3>Community Activity</h3>
                <MaintenanceMessageList
                  messages={maintenanceMessages}
                  applications={applications}
                  />
              </div>

            </div>
          </div>
        </div>
      );
    }

  });

});
