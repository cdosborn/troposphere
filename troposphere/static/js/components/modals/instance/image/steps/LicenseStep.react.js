define(function(require) {

  var React = require('react'),
      Backbone = require('backbone'),
      stores = require('stores'),
      Licenses = require('../components/Licenses.react');

  return React.createClass({

    propTypes: {
      instance: React.PropTypes.instanceOf(Backbone.Model).isRequired
    },

    getDefaultProps: function() {
      return {
        visibility: "public",
        imageUsers: new Backbone.Collection()
      };
    },

    getInitialState: function(){
      return {
        visibility: this.props.visibility,
        users: this.props.users,
        imageUsers: this.props.imageUsers || new Backbone.Collection()
      }
    },

    isSubmittable: function(){
      var hasVisibility = !!this.state.visibility;
      return hasVisibility;
    },

    onPrevious: function(){
      this.props.onPrevious({
        visibility: this.state.visibility,
        imageUsers: this.state.imageUsers
      });
    },

    onNext: function(){
      this.props.onNext({
        visibility: this.state.visibility,
        imageUsers: this.state.imageUsers
      });
    },

    onProviderChange: function(newProviderId){
      this.setState({
        providerId: newProviderId
      });
    },

    onVisibilityChange: function(newVisibility){
      // when we change visibility we should reset the user list to empty
      this.setState({
        visibility: newVisibility,
        imageUsers: new Backbone.Collection()
      });
    },

    onAddUser: function(user){
      var imageUsers = this.state.imageUsers;
      imageUsers.add(user);
      this.setState({
        imageUsers: imageUsers
      });
    },

    onRemoveUser: function(user){
      var imageUsers = this.state.imageUsers;
      imageUsers.remove(user);
      this.setState({
        imageUsers: imageUsers
      })
    },

    renderUserList: function(){
      if(this.state.visibility === "select"){
        return (
          <Users
            imageUsers={this.state.imageUsers}
            onUserAdded={this.onAddUser}
            onUserRemoved={this.onRemoveUser}
          />
        )
      }
    },

    renderBody: function () {
      var licenses = new Backbone.Collection([{
        title: "Software 1",
        type: "text",
        value: "wooooooords"
      },{
        title: "Software 2",
        type: "text",
        value: "more woooooooords"
      }]);

      return (
        <div>
          <Licenses
            imageLicenses={licenses}
            onLicenseAdded={function(){}}
            onLicenseRemoved={function(){}}
          />
          {this.renderUserList()}
        </div>
      );
    },

    render: function () {
      return (
        <div>
          <div className="modal-body">
            {this.renderBody()}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default cancel-button pull-left" onClick={this.onPrevious}>
              <span className="glyphicon glyphicon-chevron-left"></span>
              Back
            </button>
            <button type="button" className="btn btn-primary cancel-button" onClick={this.onNext} disabled={!this.isSubmittable()}>
              Next
            </button>
          </div>
        </div>
      );
    }

  });

});
