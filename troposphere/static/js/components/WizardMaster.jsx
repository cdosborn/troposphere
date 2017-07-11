import React from "react";

import stores from "stores";
import ModalHelpers from "components/modals/ModalHelpers";
import InstanceLaunchWizardModal from "components/modals/instance/InstanceLaunchWizardModal-rewrite";

export default React.createClass({
    displayName: "WizardMaster",
    componentDidMount: function() {
        stores.ImageStore.addChangeListener(this.updateState);
        this.updateState();
    },
    componentWillUnmount: function() {
        stores.ImageStore.removeChangeListener(this.updateState);
    },
    updateState: function() {
        // let images = stores.ImageStore.fetchWhere({ page_size: 10000 });
        // if (!images)
        //     return;

        // HACKS
        let props = {
            // initialView: "BASIC_VIEW",
            // image: images.get(107)
        }

        ModalHelpers.renderModal(InstanceLaunchWizardModal, props, () => {})
    },

    render: function() {
        return (<div></div>);
    }

});
