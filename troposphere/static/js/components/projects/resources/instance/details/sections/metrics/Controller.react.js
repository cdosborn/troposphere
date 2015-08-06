/** @jsx React.DOM */

define(function(require) {
    var React = require('react'),
        GraphController = require('./GraphController'),
        Timestamp = require('./Timestamp.react');

    return React.createClass({ 

        getInitialState: function() {
            var me = this;

            return { 
                graph: null, 
                uuid: this.props.instance.get("uuid"),
                timeframe: "1 hour",
                timestamp: new Date(),
                canRefresh: false,
                
                // Restrict refreshing 4000ms
                refreshDelay: 4 * 1000,
            };
        },

      componentDidMount: function() {
          var me = this;

          // Kickstart graphs since d3 needs a finished dom
          me.setState({ 
              graph: new GraphController({ 
                  container: document.querySelector("#graphs"),
              }), 
          }, me.refresh)
      },

      updateTimestamp: function() {
          this.setState({
              timestamp: new Date(),
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
              }, me.updateTimestamp.bind(me));

              // Enable refresh in a minute
              setTimeout(function(){
                  me.setState({
                      canRefresh: true,
                  }); 
              }, me.state.refreshDelay); 

          })
      },

      onTimeFrameClick : function(e) {
          this.setState({ 
              timeframe: e.target.innerHTML 
          }, function(){
              this.state.graph.switch({ 
                  uuid: this.state.uuid, 
                  timeframe: this.state.timeframe
              }, this.updateTimestamp.bind(this));
          });
      },

      onRefreshClick: function() {
          if (this.state.canRefresh) 
              this.refresh();
      },
       
      render: function() {
         var me = this;

         var breadcrumbs = ["1 hour", "1 day", "1 week"].map(function(content) {
             var selectableElement = React.DOM.li({}, React.DOM.a({
                 href: "javascript:void(0);",
                 onClick: me.onTimeFrameClick,
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
         });

         return (
           <div className="metrics">
               <div id="controls">
                   <div className="metrics breadcrumb"> { breadcrumbs } </div>
                   <span 
                       id="refresh" 
                       className={ "glyphicon glyphicon-refresh" + (!this.state.canRefresh ? " disabled" : "") }
                       onClick={ this.onRefreshClick }
                   >
                   </span>
                   <Timestamp from={ this.state.timestamp }/> 
               </div>
               <div id="container" className="metrics">
                   <div className="loading"></div>
                   <div id="graphs"></div>
               </div>
           </div>
        )
       }
                    
    });

});
