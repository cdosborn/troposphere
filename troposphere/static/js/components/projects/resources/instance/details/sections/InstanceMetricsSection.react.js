/** @jsx React.DOM */

define(function(require) {
    var React = require('react'),
        Controller = require('./metrics/Controller.react');

    return React.createClass({ 
      render: function() {

        return (
                <div>
                    <div className="resource-details-section section">
                        <h4 className="title">Instance Metrics</h4>
                    </div>
                    <div id="container" className="metrics"> 
                        <Controller instance={ this.props.instance }/>
                    </div> 
                </div>
        )
      }

    })
});
