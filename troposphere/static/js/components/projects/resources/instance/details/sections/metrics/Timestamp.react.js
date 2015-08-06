/** @jsx React.DOM */

define(function(require) {
    var React = require('react'),
        moment = require('moment');

    return React.createClass({ 

      componentDidMount: function() {
          var me = this;
          // Force the timestamp message to update 
          setInterval(me.forceUpdate.bind(me), 3 * 1000);
      },

      render: function() {
         var message = "Updated " + moment(this.props.from).fromNow();
         return (
               <div id="timestamp">{ message }</div>
         )
       }
                    
    });

})
