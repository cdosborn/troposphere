/** @jsx React.DOM */

define(function(require) {
    var React = require('react'),
        GraphController = require('./metrics/GraphController');

    return React.createClass({

      getInitialState: function() {
        return {
           graph: null,
           uuid: this.props.instance.get("uuid"),
           points: 24 * 10,
           resolution: 6,
        };
      },

      componentDidMount: function() {
          var me = this;

           me.setState({ 
               graph: new GraphController({ 
                   container: document.querySelector("#graph"),
                   uuid: me.state.uuid,
                   points: me.state.points,
                   resolution: me.state.resolution
               }), 
           }, function() {
              me.state.graph.switch(me.state.uuid);
           })
      },

      handleClick : function(e) {
          var day = 60 * 24;
          var week = 7 * 60 * 24;
          var me = this;
          glob = this;
          var el = this.refs.selectedAnchorContent.getDOMNode()
          console.log(el.innerHTML)
          switch (el.innerHTML) {      
              case "1 day":
                  me.state.graph.resolution = 6
                  me.state.graph.points = 24 * 10
                  break;
              case "1 week":
                  me.state.graph.resolution = week / 24 / 7
                  me.state.graph.points = 24 * 7
                  break;
          }
          me.forceUpdate();
      },

      onSelect : function(e) {
        var me = this;
        this.setState({ uuid : e.target.value }, function() {
            me.state.graph.switch(me.state.uuid)
        })
      },

      render: function() {
        var me = this;

        var breadcrumbs = ["1 day", "1 week"].map(function(content) {
            var selectableElement = React.DOM.li({}, React.DOM.a({
                href: "#",
                onClick: me.handleClick,
                ref: "selectedAnchorContent"
            }, content));
            var selectedElement = React.DOM.li({
                className: "active metrics"
            }, content)

            var isOneDaySelected = me.state.resolution * me.state.points <= 24 * 60;

            if (isOneDaySelected && content == "1 day" || !isOneDaySelected && content == "1 week")
                   return selectedElement
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
