
define(
  [
    'react',
    'components/modals/ModalHelpers',
    'components/modals/SSHKeyUpload.react',
    'actions',
    'modals',
    'stores'
  ],
  function (React, ModalHelpers, SSHKeyUpload,  actions, modals, stores) {

    return React.createClass({

      getInitialState: function () {
          return {
            profile: stores.ProfileStore.get(),
            ssh_keys: stores.SSHKeyStore.getAll()
          };
      },

      updateState:function() {
        this.setState(this.getInitialState());
      },

      componentDidMount: function () {
          stores.ProfileStore.addChangeListener(this.updateState);
          stores.SSHKeyStore.addChangeListener(this.updateState);
      },

      componentWillUnmount: function () {
          stores.ProfileStore.removeChangeListener(this.getInitialState);
          stores.SSHKeyStore.removeChangeListener(this.getInitialState);
      },

      handleChangeSSHPreference: function (event) {
        var isChecked = event.target.checked;
        actions.ProfileActions.updateProfileAttributes(this.state.profile, {use_ssh_keys: isChecked});
      },

      destroySSHKey: function(SSHKey) {

         // EmitChange is responsible for triggering the rerender, which
         // happens after the network request. 

         // Optimistically delete the key
         stores.SSHKeyStore.remove(SSHKey);
         SSHKey.destroy({ success: function() {
             stores.SSHKeyStore.emitChange();
         }, error: function() {
             // Re-add the key to store if delete failed
             stores.SSHKeyStore.add(SSHKey);
             stores.SSHKeyStore.emitChange();
         }});
      },

      launchSSHKeyUploadModal: function(user) {
          ModalHelpers.renderModal(SSHKeyUpload,  { user: user }, function(){});
      },

      renderSSHKeyRow: function(SSHKey) {
          var self = this;
          return <tr>
                  <td>{ SSHKey.get('name') }</td>
                  <td style={{ "word-wrap": "break-word" }}>{ SSHKey.get('pub_key').replace(/\n/g, " ") }</td>
                  <td>
                      <a onClick={ function() { self.destroySSHKey(SSHKey);} }>
                          <i style={{ "color":"crimson"}} className="glyphicon glyphicon-trash"/>
                      </a>
                  </td>
              </tr>
      },

      render: function () {
        var profile = this.state.profile;
        var ssh_keys = this.state.ssh_keys;
        var usingSSHKeys = profile.get('settings')['use_ssh_keys'];

        return (
              <div>
                <h3>SSH Configuration</h3>

                <div>
                  <input type="checkbox" checked={usingSSHKeys} onChange={this.handleChangeSSHPreference}/>&nbsp;&nbsp;&nbsp;Enable ssh access into launched instances.
                </div>
                <div>
                    <table className="clearfix table" style={{ "table-layout": "fixed" }}>
                    <thead>
                        <tr>
                            <th style={{"width": "100px"}}>name</th>
                            <th >public key</th>
                            <th style={{"width": "30px"}}></th>
                        </tr>
                    </thead>
                    <tbody> 
                        { ssh_keys ? ssh_keys.map(this.renderSSHKeyRow) : [] } 
                        <tr>
                  <td>
                      <a onClick={ this.launchSSHKeyUploadModal.bind(this, profile.get('user')) } >
                          <i className="glyphicon glyphicon-plus"/>
                      </a>
                  </td>
                  <td></td>
                  <td></td>
                        </tr>
                    </tbody>
                    </table>
                </div>
              </div>
        );
      }

    });

  });
