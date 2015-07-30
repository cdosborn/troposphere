/** @jsx React.DOM */

define(function(require) {
    var React = require('react');
    return React.createClass({ 
        getStatus: function() {
            var timestamp = this.props.timestamp; 
            var msg = "just now"
            // return "updated: " + new Date()
        },
        render: function() {
            return (<div>{this.getStatus()}</div>);
        }
    });
});
