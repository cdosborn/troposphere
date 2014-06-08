/** @jsx React.DOM */

define(
  [
    'react',
    'components/common/BootstrapModal.react',
    'actions/ProjectActions',
    'models/Project'
  ],
  function (React, BootstrapModal, ProjectActions, Project) {

    return React.createClass({

      getInitialState: function () {
        return {
          projectName: "",
          projectDescription: ""
        };
      },

      // todo: I don't think there's a reason to update state unless
      // there's a risk of the component being re-rendered by the parent.
      // Should probably verify this behavior, but for now, we play it safe.
      inputOnChange: function (e) {
        this.setState({projectName: e.target.value});
      },

      textareaOnChange: function (e) {
        this.setState({projectDescription: e.target.value});
      },

      onSubmit: function (e) {
        e.preventDefault();
      },

      // called by the parent component to show the modal
      show: function(){
        this.refs.modal.show();
      },

      //
      resetState: function(){
        this.setState({
          projectName: "",
          projectDescription: ""
        });
        $(this.getDOMNode()).find('#project-name').val("");
        $(this.getDOMNode()).find('#project-description').val("");
      },

      createProject: function () {
        // save optimistically and hide the modal
        var project = new Project({
          name: this.state.projectName,
          description: this.state.projectDescription
        });
        ProjectActions.create(project);
        this.resetState();
        this.refs.modal.hide();
      },

      render: function(){
        var buttons = [
          {type: 'primary', text: 'Create', handler: this.createProject}
        ];

        return (
          <BootstrapModal
            ref="modal"
            show={false}
            header="Create Project"
            buttons={buttons}
            handleHidden={this.resetState}
          >
            <form role='form' onSubmit={this.onSubmit}>
              <div className='form-group'>
                <label htmlFor='project-name'>Project Name</label>
                <input type='text' className='form-control' id='project-name' onChange={this.inputOnChange}/>
              </div>
              <div className='form-group'>
                <label htmlFor='project-description'>Description</label>
                <textarea type='text' className='form-control'
                          id='project-description' rows="7"
                          onChange={this.textareaOnChange}
                />
              </div>
            </form>
          </BootstrapModal>
        );
      }

    });

  });
