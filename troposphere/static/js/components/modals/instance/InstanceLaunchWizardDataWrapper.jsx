import React from "react";
import J, { Maybe, MaybeP, log } from "./J"
import ProjectCollection from "collections/ProjectCollection";
import InstanceCollection from "collections/InstanceCollection";
import IdentityCollection from "collections/IdentityCollection";
import ProviderCollection from "collections/ProviderCollection";
import SizeCollection from "collections/SizeCollection";
import ImageVersionCollection from "collections/ImageVersionCollection";
import ScriptCollection from "collections/ScriptCollection";
import AllocationSourceCollection from "collections/AllocationSourceCollection";
import { filterEndDate } from "utilities/filterCollection";

let BackboneJ = function(Collection) {
    let collection = new Collection();
    J.call(this, () => MaybeP.resolve(collection.fetch().then(() => collection)));
}

BackboneJ.prototype = Object.create(J.prototype)
BackboneJ.prototype.constructor = BackboneJ;

let StateJ = function(initialState) {
    assert(arguments.length, "StateJ: constructor called with missing arguments")
    this._state = Object.assign({}, initialState);
    J.call(this, () => MaybeP.resolve(this._state));
}

StateJ.prototype = Object.create(J.prototype)
StateJ.prototype.constructor = StateJ;

StateJ.prototype.setState = function setState(newState) {
    assert(arguments.length, "StateJ: setState called with missing arguments")

    let newStateIsSubset = Object.keys(newState).every(k => k in this._state);
    assert(newStateIsSubset, "StateJ: setState was called with fields not present initially")

    this._state = Object.assign(this._state, newState);
    this.reload();
}

let MaybeStateJ = function() {
    this._state = null;
    this._isInitialized = false;

    J.call(this, () => {
        if (this._isInitialized)
            return MaybeP.resolve(Maybe.just(this._state));
        return MaybeP.resolve(Maybe.none());
    })
}

MaybeStateJ.prototype = Object.create(StateJ.prototype);
MaybeStateJ.prototype.constructor = MaybeStateJ;
MaybeStateJ.prototype.setState = function setState(newState) {
    assert(arguments.length, "MaybeStateJ: setState called with missing arguments")
    if (!this._isInitialized) {
        this._state = Object.assign({}, newState);
        this._isInitialized = true;
    } else {
        let newStateIsSubset = Object.keys(newState).every(k => k in this._state);
        this._state = Object.assign(this._state, newState);
        assert(newStateIsSubset, "MaybeStateJ: setState was called with fields not present initially")
    }
    this.reload();
}


let DelayedStateJ = function() {
    this._state = null;
    this._isInitialized = false;

    J.call(this, () => {
        if (this._isInitialized)
            return MaybeP.resolve(this._state);
        return MaybeP.none();
    })
}

DelayedStateJ.prototype = Object.create(J.prototype)
DelayedStateJ.prototype.constructor = DelayedStateJ;
DelayedStateJ.prototype.setState = function setState(newState) {
    assert(arguments.length, "DelayedStateJ: setState called with missing arguments")
    if (!this._isInitialized) {
        this._isInitialized = true;
    } else {
        let newStateIsSubset = Object.keys(newState).every(k => k in this._state);
        assert(newStateIsSubset, "DelayedStateJ: setState was called with fields not present initially")
    }
    this._state = Object.assign({}, newState);
    this.reload();
}

const ProjectStore          = new BackboneJ(ProjectCollection)
const InstanceStore         = new BackboneJ(InstanceCollection)
const IdentityStore         = new BackboneJ(IdentityCollection)
const ProviderStore         = new BackboneJ(ProviderCollection)
const SizeStore             = new BackboneJ(SizeCollection)
const ImageVersionStore     = new BackboneJ(ImageVersionCollection)
const ScriptStore           = new BackboneJ(ScriptCollection)
const AllocationSourceStore = new BackboneJ(AllocationSourceCollection)

// Small utility for assertions
function assert(bool, str) {
    if (!bool) throw new Error(str);
}

const ImageStateJ = new DelayedStateJ();
const ComponentImage = new J(
    { imageState: ImageStateJ },
    ({ imageState: { image } }) =>
        MaybeP.resolve(image)
);
const VersionsByImageJ = new J(
    { image: ComponentImage },
    ({ image }) => {
        let imageVersionCollection = new ImageVersionCollection();
        let baseURL = imageVersionCollection.url;
        let imageId = image.get('id');

        return MaybeP.resolve(
            imageVersionCollection.fetch({
                url: `${baseURL}?image_id=${imageId}`
            }).then(
                () => imageVersionCollection.cfilter(filterEndDate)
            )
        );
    }
);

const mUserVersionState = new MaybeStateJ();
const ComponentImageVersion = new J(
    { versions: VersionsByImageJ, mUserVersionState  },
    ({ versions, mUserVersionState }) => {

        return MaybeP.resolve(new Promise(
            (resolve, reject) => {
                if (mUserVersionState.isJust()) {
                    return mUserVersionState.bind(({ imageVersion }) => resolve(imageVersion));
                }
                if (!versions.length) {
                    return reject(assert(false, "VersionsByImageJ: No image versions for an image"))
                }
                resolve(versions.first());
            }
        ))
    }
);

const mSelectedProvider = new MaybeStateJ();
const ShuffledProvidersByImageVersion = new J(
    { imageVersion: ComponentImageVersion, providers: ProviderStore },
    ({ imageVersion, providers }) => {
        let versionProviders = imageVersion.get("machines").map(m => m.provider.id);

        // Return version providers (but prefer our models)
        return MaybeP.resolve(
            // TODO: replace includes test with memebership in a Set test
            providers.cfilter(prov => versionProviders.includes(prov.id))
                    .cshuffle()
        );
    }
);

const ComponentProvider = new J(
    { providers: ShuffledProvidersByImageVersion, mSelectedProvider },
    ({ providers, mSelectedProvider }) =>
        MaybeP.resolve(new Promise(
            (resolve, reject) => {
                if (mSelectedProvider.isJust()) {
                    return mSelectedProvider.bind(({ provider }) => resolve(provider));
                }
                if (!providers.length) {
                    return reject(assert(false, "ComponentProvider: User has no providers"))
                }
                resolve(providers.first());
            }
        ))
);

const ComponentIdentity = new J(
    { provider: ComponentProvider, identities: IdentityStore },
    ({ provider, identities }) =>

       // TODO: if `find` fails, could call MaybeP.reject
       MaybeP.resolve(
           identities.find(ident => ident.get("provider").id === provider.id)
       )
);

const SizesByProvider = new J(
    { provider: ComponentProvider, sizes: SizeStore },
    ({ provider, sizes }) =>

       // TODO: if `find` fails, could call MaybeP.reject
       MaybeP.resolve(
           sizes.cfilter(size => size.get("provider").id === provider.id)
       )
);
const mSelectedProviderSize = new MaybeStateJ();
const ComponentProviderSize = new J(
    { sizes: SizesByProvider, mSelectedProviderSize },
    ({ sizes, mSelectedProviderSize }) =>
        MaybeP.resolve(new Promise(
            (resolve, reject) => {
                if (mSelectedProviderSize.isJust()) {
                    return mSelectedProviderSize.bind(({ providerSize }) => resolve(providerSize));
                }
                if (!sizes.length) {
                    return reject(assert(false, "ComponentProviderSize: Provider  has no sizes"))
                }
                resolve(sizes.first());
            }
        ))
);

const mSelectedProject = new MaybeStateJ();
const ComponentProject = new J(
    { projects: ProjectStore, mSelectedProject },
    ({ projects, mSelectedProject }) =>
        MaybeP.resolve(new Promise(
            (resolve, reject) => {
                if (mSelectedProject.isJust()) {
                    return mSelectedProject.bind(({ project }) => resolve(project));
                }
                if (!projects.length) {
                    return reject(assert(false, "ComponentProject: User has no projects"))
                }
                resolve(projects.first());
            }
        ))
)

const mSelectedAllocationSource = new MaybeStateJ();
const ComponentAllocationSource = new J(
    { allocations: AllocationSourceStore, mSelectedAllocationSource },
    ({ allocations, mSelectedAllocationSource }) =>
        MaybeP.resolve(new Promise(
            (resolve, reject) => {
                if (mSelectedAllocationSource.isJust()) {
                    return mSelectedAllocationSource.bind(({ allocationSource }) => resolve(allocationSource));
                }
                if (!allocations.length) {
                    return reject(assert(false, "ComponentAllocationSource: User has no allocation sources"))
                }
                resolve(allocations.first());
            }
        ))
)

const ComponentResourcesUsed = new J(
    { provider: ComponentProvider, instances: InstanceStore },
    ({ provider, instances }) => {

        let inital = {
            cpu: 0,
            mem: 0,
            disk: 0
        };

        return MaybeP.resolve(
            instances
                // Get the instances for this provider
                .cfilter(i => i.get("identity").provider === provider.id)

                // Map each instance to it's size
                .cmap(i => i.get("size"))

                // Add each size to a running total
                .reduce((total, size) => ({
                    cpu: total.cpu + size.cpu,
                    mem: total.mem + size.mem,
                    disk: total.disk + size.disk,
                }), inital)
        );
    }
);

const mEnteredInstanceName = new MaybeStateJ();
const ComponentInstanceName = new J(
    { image: ComponentImage, mEnteredName: mEnteredInstanceName },
    ({ image, mEnteredName }) =>
        MaybeP.resolve(new Promise(
            (resolve, reject) => {
                if (mEnteredName.isJust()) {
                    return mEnteredName.bind(({ instanceName }) => resolve(instanceName));
                }
                resolve(
                    image.get("name")
                         .replace(/\./g, '_')
                );
            }
        ))
);

const ComponentProps = new J(
    {
        image: ComponentImage,
        imageVersionList: VersionsByImageJ,
        imageVersion: ComponentImageVersion,
        projectList: ProjectStore,
        project: ComponentProject,
        projectList: ProjectStore,
        project: ComponentProject,
        allocationSourceList: AllocationSourceStore,
        allocationSource: ComponentAllocationSource,
        providerList: ShuffledProvidersByImageVersion,
        provider: ComponentProvider,
        identity: ComponentIdentity,
        providerSizeList: SizesByProvider,
        providerSize: ComponentProviderSize,
        resourcesUsed: ComponentResourcesUsed,
        instanceName: ComponentInstanceName,
    }, data => {
        console.log(data.instanceName);
        return MaybeP.resolve(data);
    }
)
// window.StateJ = StateJ;
window.ComponentInstanceName = ComponentInstanceName;
window.ProviderStore = ProviderStore;
window.ComponentProviderSize = ComponentProviderSize;
window.ComponentProvider = ComponentProvider;
window.VersionsByImageJ = VersionsByImageJ;
window.ProjectStore = ProjectStore;
window.DelayedStateJ = DelayedStateJ;
window.ImageStateJ = ImageStateJ;
window.ComponentImageVersion = ComponentImageVersion;
window.mUserVersionState = mUserVersionState;
window.J  = J;
window.Maybe = Maybe;
window.MaybeP = MaybeP;
window.log = log;

export default function(Component) {
    return React.createClass({
        propTypes: {
            image: React.PropTypes.instanceOf(Backbone.Model)
        },
        getInitialState() {
            return {
                allocationSource:     null,
                allocationSourceList: null,
                identity:             null,
                image:                null,
                imageVersion:         null,
                imageVersionList:     null,
                instanceName:         null,
                project:              null,
                projectList:          null,
                provider:             null,
                providerList:         null,
                providerSize:         null,
                resourcesUsed:        null,
            };
        },
        componentWillReceiveProps(newProps) {
            if (newProps.image) {
                ImageStateJ.setState({ image: newProps.image });
            }
        },
        componentDidMount() {
            if (this.props.image) {
                ImageStateJ.setState({ image: this.props.image });
            }

            ComponentProps.subscribe(props => this.setState(props));
        },

        onNameChange(instanceName) {
            mEnteredInstanceName.setState({ instanceName });
        },

        onImageChange(image) {
            ImageStateJ.setState({ image });
        },

        onAllocationSourceChange(allocationSource) {
            mSelectedAllocationSource.setState({ allocationSource });
        },

        onProviderChange(provider) {
            mSelectedProvider.setState({ provider });
        },

        onProjectChange(project) {
            mSelectedProject.setState({ project });
        },
        onVersionChange(imageVersion) {
            mUserVersionState.setState({ imageVersion });
        },
        onSizeChange(providerSize) {
            mSelectedProviderSize.setState({ providerSize });
        },
        render() {
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
            } = this.state;

            let extendedProps = Object.assign({}, this.props, {
                onImageChange: this.onImageChange,
                onVersionChange: this.onVersionChange,
                onProjectChange: this.onProjectChange,
                onAllocationSourceChange: this.onAllocationSourceChange,
                onProviderChange: this.onProviderChange,
                onSizeChange: this.onSizeChange,
                onNameChange: this.onNameChange,
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
            })
            return <Component {...extendedProps}/>
        }
    })
};
