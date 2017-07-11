// Author's Note:
// Although this feature is a step in the right direction, we should try to solve
// a few problems with how we deal with state and async requests that are dependent
// on each other. For example, because we are waiting for data on network requests,
// for data we want in state, we would need to set state on these values by calling
// setState from a change listener, however because we might already have it, we also
// need to set state from the event listener. Another requirement is that we are populating
// default values that are dependent on other values the user might change, so many event
// listeners will call setState on those dependent values as well. All of this logic is currently
// duplicated in every place mentioned. One solution might be to contain all of this
// dependent logic in a single function that is called by passing the key value
// pair to be changed and returns a new object to pass into setState from any call site we wish.

import React from "react";
import Backbone from "backbone";
import _ from "underscore";
import modals from "modals";
import stores from "stores";
import InstanceLaunchWizardModalDataWrapper from "./InstanceLaunchWizardDataWrapper"
import globals from "globals";
import actions from "actions";
import BootstrapModalMixin from "components/mixins/BootstrapModalMixin";
import { filterEndDate } from "utilities/filterCollection";

import ImageSelectStep from "./launch/steps/ImageSelectStep";
import ProjectCreateView from "components/common/ProjectCreateView";
import BasicLaunchStep from "./launch/steps/BasicLaunchStep";
import AdvancedLaunchStep from "./launch/steps/AdvancedLaunchStep";
import LicenseStep from "./launch/steps/LicenseStep";

// This class implements the instance launch walkthrough. By design it keeps
// track of two states. First is the state for switching between separate
// views of the modal. The second is the state for launching an actual
// instance, i.e. the state requisite for the launch api call (see
// onSubmitLaunch). Do not add state friviously. This component operates by
// defining all the operations to update its state as functions which it
// passes to the appropriate children.
const InstanceLaunchWizardModalView = React.createClass({
    mixins: [BootstrapModalMixin],
    displayName: "InstanceLaunchWizardModal",

    propTypes: {
        image: React.PropTypes.instanceOf(Backbone.Model),
        project: React.PropTypes.instanceOf(Backbone.Model),
        onConfirm: React.PropTypes.func.isRequired,
        initialView: React.PropTypes.string,
    },

    getInitialState() {
        return this.getStateFromProps(this.props);
    },

    componentWillReceiveProps(props) {
        this.setState(this.getStateFromProps(props));
    },

    getStateFromProps(props) {
        let {
            image,
            initialView,
            projectList,
        } = props;

        // In this context this.state may not exist.
        let state = this.state = {};

        let view = state.initialView || initialView;
        console.log("image?", image);
        if (image) {
            view = "BASIC_VIEW";
        } else if (!view) {
            view = "IMAGE_VIEW";
        }

        let noProjects = projectList && !projectList.length;
        let notImagesView = view != "IMAGE_VIEW";
        if (noProjects && notImagesView) {
            // Send user to "PROJECT_VIEW" to create one
            view = "PROJECT_VIEW";
        }

        let attachedScripts = state.attachedScripts || [];

        return {
            // State for general operation (switching views, etc)
            view,
            showValidationErr: false,

            // State for launch
            attachedScripts,
        }
    },

    updateState: function() {
        this.forceUpdate();
    },

    componentDidMount: function() {
        stores.ScriptStore.addChangeListener(this.updateState);
    },

    componentWillUnmount: function() {
        stores.ScriptStore.removeChangeListener(this.updateState);
    },

    viewImageSelect: function() {
        this.setState({
            view: "IMAGE_VIEW"
        });
    },

    viewProject: function() {
        this.setState({
            view: "PROJECT_VIEW"
        });
    },

    viewBasic: function() {
        this.setState({
            view: "BASIC_VIEW"
        });
    },

    viewAdvanced: function() {
        this.setState({
            view: "ADVANCED_VIEW"
        });
    },

    viewLicense: function() {
        this.setState({
            view: "LICENSE_VIEW"
        });
    },

    onBack: function() {
        this.viewImageSelect();
    },

    onRequestResources: function() {
        this.hide();
        modals.HelpModals.requestMoreResources({
            identity: this.props.identity.id
        });
    },

    onAddAttachedScript: function(value) {
        let attachedScripts = this.state.attachedScripts;
        if (attachedScripts.indexOf(value) === -1) {
            this.setState({
                attachedScripts: [...attachedScripts, value]
            });
        }
    },

    onRemoveAttachedScript: function(item) {
        let attachedScripts = this.state.attachedScripts
            .filter((i) => i != item);

        this.setState({
            attachedScripts
        });
    },

    onSaveAdvanced: function() {
        this.viewBasic()
    },

    onClearAdvanced: function() {
        this.setState({
            attachedScripts: []
        });
    },

    onProjectCreateConfirm: function(name, description) {
        this.viewBasic();
        actions.ProjectActions.create({
            name: name,
            description
        });
    },

    onSubmitLaunch: function() {
        let licenseList = this.props.imageVersion.get("licenses");
        if (!this.canLaunch()) {
            this.setState({
                showValidationErr: true
            })
            return;
        }


        // TODO: move this to the proper location
        if (licenseList.length >= 1 && this.state.view === "BASIC_VIEW") {
            this.viewLicense();
            return
        }

        let {
            allocationSource,
            project,
            identity,
            imageVersion,
            providerSize,
            instanceName,
        } = this.props;

        let launchData = {
            project,
            identity,
            instanceName: instanceName.trim(),
            size: providerSize,
            version: imageVersion,
            scripts: this.state.attachedScripts
        };

        if (globals.USE_ALLOCATION_SOURCES) {
            launchData.allocation_source_uuid = allocationSource.get("uuid");
        }

        actions.InstanceActions.launch(launchData);
        this.hide();
    },

    hasAdvancedOptions: function() {
        //TODO: Once more advanced options are added,
        //this will need to be a recursive check.
        return (this.state.attachedScripts.length > 0)
    },

    // Returns true if instance launch will exceed the user's allotted
    // resources.
    exceedsResources: function() {
        let {
            allocationSource,
            identity,
            provider,
            providerSize: size,
            resourcesUsed,
        } = this.props;

        if (identity && size && provider) {

            /* eslint-disable no-unused-vars */

            // AU's Used
            let allocationConsumed,
                allocationTotal;

            // If we are not using AllocationSource set to provider
            if (globals.USE_ALLOCATION_SOURCES) {
                allocationConsumed = allocationSource.get("compute_used");
                allocationTotal = allocationSource.get("compute_allowed");
            } else {
                allocationConsumed = identity.get("usage").current;
                allocationTotal = identity.get("usage").threshold;
            }

            // CPU's have used + will use
            let allocationCpu = identity.get("quota").cpu;
            let cpuWillTotal = resourcesUsed.cpu + size.get("cpu");

            // Memory have used + will use
            let allocationMem = identity.get("quota").memory;
            let memUsed = resourcesUsed.mem / 1024;
            let memWillTotal = memUsed + size.get("mem");
            //NOTE: Forcibly removed to disable enforcement on the UI side - By Sgregory
            // if (allocationConsumed >= allocationTotal) {
            //     return true;
            // }
            /* eslint-enable no-unused-vars */
            if (cpuWillTotal > allocationCpu) {
                return true;
            }
            if (memWillTotal > allocationMem) {
                return true;
            }
            return false
        }
        return true;
    },

    invalidName() {
      let regex = /\.(\d)+$/gm;
      return this.props.instanceName.match(regex);
    },

    canLaunch: function() {
        // TODO: move attached scripts to props
        let requiredFields = ["instanceName", "project", "identity", "providerSize", "imageVersion", "attachedScripts"];

        // Check if we are using AllocationSource and add to requierd fields
        if (globals.USE_ALLOCATION_SOURCES) {
            requiredFields.push("allocationSource");
        }

        // All required fields are truthy
        let requiredExist = _.every(requiredFields, (prop) => Boolean(this.props[prop]))

        return (
            requiredExist
            && !this.exceedsResources()
            && !this.invalidName()
        )
    },

    renderBody: function() {
        let view = this.state.view;
        switch (view) {
            case "IMAGE_VIEW":
                return this.renderImageSelect()
            case "PROJECT_VIEW":
                return this.renderProjectCreateStep()
            case "BASIC_VIEW":
                return this.renderBasicOptions()
            case "ADVANCED_VIEW":
                return this.renderAdvancedOptions()
            case "LICENSE_VIEW":
                return this.renderLicenseStep()
        }
    },

    headerTitle: function() {
        let view = this.state.view;
        switch (view) {
            case "IMAGE_VIEW":
                return "Select an Image"
            case "PROJECT_VIEW":
                return "Create New Project"
            case "BASIC_VIEW":
                return "Basic Options"
            case "ADVANCED_VIEW":
                return "Advanced Options"
            case "LICENSE_VIEW":
                return "License Agreement"
        }
    },

    renderImageSelect: function() {
        return (
        <ImageSelectStep image={this.props.image} onSelectImage={this.onImageChange} onCancel={this.hide} />
        );
    },

    onImageChange(image) {
        this.props.onImageChange(image);
    },

    renderProjectCreateStep: function() {
        return (
        <ProjectCreateView cancel={this.hide} onConfirm={this.onProjectCreateConfirm} />
        );
    },

    renderBasicOptions: function() {
        let {
            allocationSource,
            allocationSourceList,
            identity,
            image,
            imageVersion,
            imageVersionList,
            instanceName,
            project,
            projectList,
            provider,
            providerList,
            providerSize,
            providerSizeList,
            resourcesUsed,
        } = this.props;

        console.log("instanceName", instanceName);
        return (
        <BasicLaunchStep { ...{ showValidationErr: this.state.showValidationErr, attachedScripts: this.state.attachedScripts, backIsDisabled: this.props.initialView=="BASIC_VIEW"
            , launchIsDisabled: !this.canLaunch(), identityProvider: identity, image, imageVersion, imageVersionList, instanceName,
            onBack: this.onBack, onCancel: this.hide, onNameChange: this.props.onNameChange, onProjectChange: this.props.onProjectChange, onAllocationSourceChange:
            this.props.onAllocationSourceChange, onProviderChange: this.props.onProviderChange, onRequestResources: this.onRequestResources, onSizeChange: this.props.onSizeChange, onSubmitLaunch:
            this.onSubmitLaunch, onVersionChange: this.props.onVersionChange, project, projectList, provider, providerList, providerSize, providerSizeList, resourcesUsed, viewAdvanced:
            this.viewAdvanced, hasAdvancedOptions: this.hasAdvancedOptions(), allocationSource, allocationSourceList, }} />
        )
    },

    renderAdvancedOptions: function() {
        let bootScriptList = stores.ScriptStore.getAll();
        return (
        <AdvancedLaunchStep bootScriptList={bootScriptList}
            attachedScripts={this.state.attachedScripts}
            onAddAttachedScript={this.onAddAttachedScript}
            onRemoveAttachedScript={this.onRemoveAttachedScript}
            onClearAdvanced={this.onClearAdvanced}
            onSaveAdvanced={this.onSaveAdvanced}
            hasAdvancedOptions={this.hasAdvancedOptions()} />
        );
    },

    renderLicenseStep: function() {
        let licenseList = this.props.imageVersion.get("licenses");

        if (!licenseList) {
            return
        }
        return (
        <LicenseStep licenseList={licenseList}
            onSubmitLaunch={this.onSubmitLaunch}
            onBack={this.viewBasic}
            onCancel={this.hide} />
        )
    },

    render: function() {
        return (
        <div className="modal fade">
            <div className="modal-dialog" style={{ width: "100%", maxWidth: "800px" }}>
                <div className="modal-content">
                    <div className="modal-header instance-launch">
                        {this.renderCloseButton()}
                        <h1 className="t-title">Launch an Instance / {this.headerTitle()}</h1>
                    </div>
                    <div className="modal-body">
                        {this.renderBody()}
                    </div>
                </div>
            </div>
        </div>
        );
    }
});

export default InstanceLaunchWizardModalDataWrapper(InstanceLaunchWizardModalView);
