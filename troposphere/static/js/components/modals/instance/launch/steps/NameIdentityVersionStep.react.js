define(function (require) {

  var _ = require("underscore"),
      React = require('react'),
      Backbone = require('backbone'),
      stores = require('stores'),
      MachineSelect = require('../components/MachineSelect.react'),
      IdentitySelect = require('../components/IdentitySelect.react');

  return React.createClass({

    propTypes: {
      application: React.PropTypes.instanceOf(Backbone.Model),
      version: React.PropTypes.instanceOf(Backbone.Model),
      identity: React.PropTypes.instanceOf(Backbone.Model),
      name: React.PropTypes.string,
      onPrevious: React.PropTypes.func.isRequired,
      onNext: React.PropTypes.func.isRequired
    },

    getInitialState: function () {
      return {
        name: this.props.name,
        version: this.props.version,
        identity: this.props.identity
      };
    },
    isSubmittable: function () {
      if (!this.state.identity)
        return false;
      var allocation = this.state.identity.get('allocation'),
      // Allocation Usage cannot exceed 100%
        allocationUsageStats = this.calculateAllocationUsage(allocation);
      //TODO: Short-circuit on isStaff

      return (this.state.name && this.state.version && this.state.identity && allocationUsageStats.percentUsed < 1);
    },
    confirm: function () {
      //Test if information is valid before continuing
      this.props.onNext(this.state);
    },
    onBack: function () {
      this.props.onPrevious(this.state);
    },
    componentDidMount: function () {
      stores.IdentityStore.addChangeListener(this.updateState);
      stores.ProviderMachineStore.addChangeListener(this.updateState);
    },

    componentWillUnmount: function () {
      stores.IdentityStore.removeChangeListener(this.updateState);
      stores.ProviderMachineStore.removeChangeListener(this.updateState);
    },

    onNameChange: function (e) {
      var newName = e.target.value;
      this.setState({name: newName});
    },

    onVersionChange: function (e) {
      var newVersionId = e.target.value;
      var versions = this.props.application.get('provider_images');
      var selectedVersion = versions.get(newVersionId);
      this.setState({version: selectedVersion});
    },

    onIdentityChange: function (e) {
      var newIdentityId = e.target.value;
      var selectedIdentity = stores.IdentityStore.get(newIdentityId);
      this.setState({identity: selectedIdentity});
    },
    cleanVersions: function (versions) {
      // don't show duplicate images
      versions = new versions.constructor(_.uniq(versions.models, function (m) {
        return m.get('uuid');
      }));
      //TODO: Sort Me!
      return versions;
    },
    calculateAllocationUsage: function (allocation) {
      var maxAllocation = allocation.threshold;
      var currentAllocation = allocation.current;

      return {
        currentUsage: currentAllocation,
        maxAllocation: maxAllocation,
        percentUsed: currentAllocation / maxAllocation
      };
    },
    renderAllocationConsumption: function (identity) {
      var allocation = identity.get('allocation'),
      // Allocation Usage
        allocationUsageStats = this.calculateAllocationUsage(allocation),

      // convert to percentages
        currentlyUsed = allocationUsageStats.currentUsage,
        maximumAllowed = allocationUsageStats.maxAllocation,
        currentlyUsedPercent = allocationUsageStats.percentUsed * 100,
        message = (
          "You have currently used " + (Math.round(currentlyUsed)) + " of " + maximumAllowed + " AUs on this Provider."
        ),
        overQuotaMessage = (
          <div>
            <strong>CPU quota exceeded.</strong>
            <span>{" Choose another provider or request more resources to launch a new instance."}</span>
          </div>
        );

      return this.renderProgressBar(message, currentlyUsedPercent, 0, overQuotaMessage);
    },

    renderProgressBar: function (message, currentlyUsedPercent, projectedPercent, overQuotaMessage) {
      var currentlyUsedStyle = {width: currentlyUsedPercent + "%"},
        projectedUsedStyle = {width: projectedPercent + "%", opacity: "0.6"},
        totalPercent = currentlyUsedPercent + projectedPercent,
        barTypeClass;

      if (totalPercent <= 50) {
        barTypeClass = "progress-bar-success";
      } else if (totalPercent <= 100) {
        barTypeClass = "progress-bar-warning";
      } else {
        barTypeClass = "progress-bar-danger";
        projectedUsedStyle.width = (100 - currentlyUsedPercent) + "%";
        message = overQuotaMessage;
      }

      return (
        <div className="allocation-consumption-bar">
          <div className="progress">
            <div className="value">{Math.round(currentlyUsedPercent + projectedPercent) + "%"}</div>
            <div className={"progress-bar " + barTypeClass} style={currentlyUsedStyle}></div>
            <div className={"progress-bar " + barTypeClass} style={projectedUsedStyle}></div>
          </div>
          <div>{message}</div>
        </div>
      );
    },


    renderBody: function () {
      var image = this.props.application,
        identities = stores.IdentityStore.getAll(),
        providers = stores.ProviderStore.getAll(),
        versions = image.getVersions();
      // versions = image.get('provider_images');

      if (!providers || !identities || !versions) return <div className="loading"></div>;

      // don't show duplicate images
      versions = this.cleanVersions(versions);

      // remove identities whose provider has no versions
      // identities = new identities.constructor(identities.filter(function (i) {
      //     return versions.find(function (m) {
      //         return m.get('provider').id === i.get('provider').id;
      //     });
      // }));
      if (!this.state.identity) {
        this.state.identity = identities.first();
      }
      if (!this.state.version) {
        this.state.version = versions.first();
      }

      return (
        <div role='form'>
          <div className="modal-section form-horizontal">
            <h4>Basic Information</h4>

            <div className='form-group'>
              <label htmlFor='instance-launch-name' className="col-sm-3 control-label">Instance Name</label>

              <div className="col-sm-9">
                <input
                  type='text'
                  className='form-control'
                  id='instance-launch-name'
                  value={this.state.name}
                  onChange={this.onNameChange}
                  />
              </div>
            </div>

            <div className='form-group'>
              <label htmlFor='machine' className="col-sm-3 control-label">Version</label>

              <div className="col-sm-9">
                <MachineSelect
                  machine={this.state.version}
                  machines={versions}
                  onChange={this.onVersionChange}
                  />
              </div>
            </div>
            {
              //TODO: Include some interesting information about Selected version here?
              //IDEAS: Description
              //TODO: Include some interesting information about Selected Identity here?
              // IDEAS: Current Allocation Usage?
            }
            <div className='form-group'>
              <label htmlFor='identity' className="col-sm-3 control-label">Provider</label>

              <div className="col-sm-9">
                <IdentitySelect
                  identityId={this.state.identityId}
                  identities={identities}
                  providers={providers}
                  onChange={this.onIdentityChange}
                  />
              </div>
            </div>
            <div className="form-group modal-section">
              <h4>Project Allocation Usage</h4>
              {this.renderAllocationConsumption(this.state.identity)}
            </div>

          </div>
        </div>
      );
    },
    render: function () {

      return (
        <div>
          {this.renderBody()}
          <div className="modal-footer">
            <button type="button" className="btn btn-default pull-left" onClick={this.onBack}>
              <span className="glyphicon glyphicon-chevron-left"></span>
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={this.confirm} disabled={!this.isSubmittable()}>
              Continue
            </button>
          </div>

        </div>
      );
    }

  });

});
