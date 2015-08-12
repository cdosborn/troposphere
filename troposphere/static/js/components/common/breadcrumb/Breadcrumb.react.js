define(function (require) {

  var React = require('react'),
    Router = require('react-router');

  return React.createClass({

    propTypes: {
      breadcrumb: React.PropTypes.object.isRequired,
      onClick: React.PropTypes.func.isRequired,
    },

    mouseOver: function () {
      this.props.onMouseOn(this.props.breadcrumb.name);
    },

    mouseOut: function () {
      this.props.onMouseOff();
    },

    renderLink: function () {
      var class_names = this.props.breadcrumb.state;
      var divStyle = {
        width: this.props.width + '%'
      };

      return (
        <div style={divStyle} onMouseOver={this.mouseOver} onMouseOut={this.mouseOut} className={class_names}
             onClick={this.crumbClicked}>
          {this.props.breadcrumb.step + 1}
        </div>
      );
    },
    crumbClicked: function () {
      if (!this.props.breadcrumb.inactive) {
        return this.props.onClick(this.props.breadcrumb);
      }
    },
    render: function () {
      return this.renderLink();
    }

  });

});
