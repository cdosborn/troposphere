import React from "react";
import Backbone from "backbone";
import VolumeTable from "./VolumeTable";
import NoVolumeNotice from "./NoVolumeNotice";

export default React.createClass({
    displayName: "VolumeList",

    propTypes: {
        volumes: React.PropTypes.instanceOf(Backbone.Collection).isRequired,
        onResourceSelected: React.PropTypes.func.isRequired,
        onResourceDeselected: React.PropTypes.func.isRequired,
        onPreviewResource: React.PropTypes.func.isRequired,
        previewedResource: React.PropTypes.instanceOf(Backbone.Model),
        selectedResources: React.PropTypes.instanceOf(Backbone.Collection)
    },

    render: function() {
        var volumes = this.props.volumes,
            content;

        if (this.props.volumes.length <= 0) {
            content = <NoVolumeNotice />;
        } else {
            content = (
                <VolumeTable
                    volumes={volumes}
                    onResourceSelected={this.props.onResourceSelected}
                    onResourceDeselected={this.props.onResourceDeselected}
                    onPreviewResource={this.props.onPreviewResource}
                    previewedResource={this.props.previewedResource}
                    selectedResources={this.props.selectedResources}
                />
            );
        }

        return (
            <div>
                <div className="header">
                    <i className="glyphicon glyphicon-hdd" />
                    <h3 className="title-3">Volumes</h3>
                </div>
                {content}
            </div>
        );
    }
});
