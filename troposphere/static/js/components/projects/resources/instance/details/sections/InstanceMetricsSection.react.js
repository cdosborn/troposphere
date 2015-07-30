/** @jsx React.DOM */

define(function(require) {
    var React = require('react'),
        GraphController = require('./metrics/GraphController'),
        LastUpdatedComponent = require('./metrics/LastUpdatedComponent.react');

    return React.createClass({ 

        getInitialState: function() {
            var me = this;

            // Enable refresh in a minute
            setTimeout(function(){
                me.setState({
                    canRefresh: true,
                }); 
            }, 1000 * 3);

            return { 
                graph: null, 
                uuid: this.props.instance.get("uuid"),
                timeframe: "1 hour",
                canRefresh: false,
            };
        },

      componentDidMount: function() {
          var me = this;

           me.setState({ 
               graph: new GraphController({ 
                   container: document.querySelector("#graph"),
               }), 
           }, function() {
              this.state.graph.switch({ 
                  uuid: this.state.uuid, 
                  timeframe: this.state.timeframe,
                  timestamp: Date.now()
              });
           })
      },

      refresh: function() {
          var me = this;
            // Disable refresh button
          me.setState({
              canRefresh: false,
          }, function() {

              this.state.graph.switch({ 
                  uuid: this.state.uuid, 
                  timeframe: this.state.timeframe,
                  refresh: true,
              });

              // Enable refresh in a minute
              setTimeout(function(){
                  me.setState({
                      canRefresh: true,
                  }); 
              }, 1000 * 3); 

          })
      },

      handleClick : function(e) {
          this.setState({ timeframe: e.target.innerHTML }, function(){
              this.state.graph.switch({ 
                  uuid: this.state.uuid, 
                  timeframe: this.state.timeframe
              });
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

        breadcrumbs.push(React.DOM.span({
            id: "refresh", 
            className: "glyphicon glyphicon-refresh" + 
                (this.state.canRefresh ? "" : " disabled"),
            onClick: me.refresh,
            style: { padding: '0 0 0 15px' }
        }));

        return React.DOM.div(null,
            React.DOM.div({className: "resource-details-section section"},
                React.DOM.h4({
                    className: "title"}
                , "Instance Metrics"),

                React.DOM.div({
                    id: "container",
                    className: "metrics"
                },[
                    React.DOM.div({
                        id: "controls-container"
                    }, [
                        React.DOM.div({
                            id: "controls",
                            className: "metrics breadcrumb" 
                        }, breadcrumbs), 

                        React.createElement(LastUpdatedComponent, {
                            timestamp: Date.now(),
                        }),
                    ]),

                    React.DOM.div({ 
                        id:"graph",
                        className:"metrics"
                    }),

                    React.DOM.div({ 
                        className:"loading",
                        style: { display: "none" }
                    })
                ])
            )
        )
      }

    })
});
