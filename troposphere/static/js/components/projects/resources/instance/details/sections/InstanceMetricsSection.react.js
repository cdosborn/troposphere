/** @jsx React.DOM */

define(function(require) {
    var React = require('react'),
        GraphController = require('./metrics/GraphController');

    return React.createClass({

      getInitialState: function() {
        return {
           graph: null,
           uuid: this.props.instance.get("uuid"),
           timeframe: "1 hour",
        };
      },

      componentDidMount: function() {
          var me = this;

           me.setState({ 
               graph: new GraphController({ 
                   container: document.querySelector("#graph"),
                   uuid: me.state.uuid,
                   timeframe: me.state.timeframe               
               }), 
           }, function() {
              this.state.graph.switch(this.state.uuid, this.state.timeframe);
           })
      },

      handleClick : function(e) {
          this.setState({ timeframe: e.target.innerHTML }, function(){
              this.state.graph.switch(this.state.uuid, this.state.timeframe);
          });
      },

      render: function() {
        var me = this;

        var breadcrumbs = ["1 hour", "1 day", "1 week"].map(function(content) {
            var selectableElement = React.DOM.li({}, React.DOM.a({
                href: "javascript:void(0);",
                onClick: me.handleClick,
                ref: "selectedAnchorContent"
            }, content));
            var selectedElement = React.DOM.li({
                id: content,
                className: "active metrics"
            }, content)

            if (content == me.state.timeframe) {
               return selectedElement
            }
            return selectableElement
        })

        return React.DOM.div(null,
            React.DOM.div({className : "resource-details-section section"},
                React.DOM.h4({class : "title"}, "Instance Metrics"),

                React.DOM.ol({
                    id: "controls",
                    className: "metrics breadcrumb" 
                }, breadcrumbs), 

                React.DOM.div({ 
                    id:"graph",
                    className:"metrics"
                })
            )
        )
      }

    })
});
