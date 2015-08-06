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
                
                // Determine if service is available
                //   null: service has no status (loading)
                //   false: metrics api failed
                //   true: metrics api success
                available: null,

                // Restrict refreshing
                canRefresh: false,
                
                // Set refresh interval to 1 minute
                refreshDelay: 60 * 1000,
            };
        }, 
        onSuccess: function() {
            // Called after successfully fetching data
            this.setState({ 
                available: true,
                timestamp: new Date(),
            });
        },

        onError: function() {
            // Called after failing to fetch data
            //throw new Error("metrics could not be fetched");
            this.setState({ available: false });
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
                }, this.onSuccess, this.onError);

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
              }, this.onSuccess, this.onError);
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

         var controlsClass = "glyphicon glyphicon-refresh";
         if (!this.state.canRefresh) {
             controlsClass += " disabled";
         }
         var controls =
             <div id="controls"> 
                <div className="metrics breadcrumb">{ breadcrumbs }</div>
                <span 
                    id="refresh" 
                    className={ controlsClass }
                    onClick={ this.onRefreshClick } >
                </span>
                <Timestamp from={ this.state.timestamp }/> 
            </div>

         if (this.state.available || 
             this.state.available === null) {
             return ( 
                 <div className="metrics"> 
                    { this.state.available !== null ? controls : "" }
                    <div id="container" className="metrics">
                       <div className="loading"></div>
                       <div id="graphs"></div>
                    </div>
                </div>
            )
         } 

         return (<div id="not-available">Instance metrics not available</div>)
       }
                    
    });

});
