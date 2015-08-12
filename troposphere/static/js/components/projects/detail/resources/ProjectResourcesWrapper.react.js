
define(
  [
    'react',
    'backbone',
    './SubMenu.react'
  ],
  function (React, Backbone, SubMenu) {

    return React.createClass({

      propTypes: {
        project: React.PropTypes.instanceOf(Backbone.Model).isRequired,
        children: React.PropTypes.component.isRequired
      },

      render: function () {
        return (
          <div className="container">
            <table>
              <tbody>
              <tr>
                <td className="td-sub-menu">
                  <SubMenu project={this.props.project}/>
                </td>
                <td className="td-project-content">
                  {this.props.children}
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        );
      }

    });

  });
