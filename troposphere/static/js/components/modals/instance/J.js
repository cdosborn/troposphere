function J(bindings, promiseFunc) {
    assert(this, "J: Constructor called without 'new' keyword");

    // Accomodate the following signature:
    // J(callback) w/o dependencies
    if (bindings instanceof Function
        && arguments.length == 1) {
        promiseFunc = bindings;
        bindings = {};
    }
    this.bindings = bindings;
    this.deps = Object.values(bindings);
    this.data = null;
    this.initialized = false;
    this.active = false;
    this.pending = false;
    this.depsPending = false;
    this.promiseFunc = promiseFunc;
    this.pendingPromise = null;
    this.bindings = bindings;
    this.dependees = [];
    this.subscriptions = {
        "pending": new Set(),
        "change": new Set(),
        "default": new Set()
    };

    // Todo: explain this
    this.specialSubscriptions = {
        "active": new Set()
    };

    // The current node is a dependee of its dependencies
    this.deps.forEach(d => d.dependees.push(this));
}

// The only distinction between compute and yield, is that yield will return
// an existing promise, whereas compute always re computes/builds a new
// promise
J.prototype.yield = function() {
    let loading = this.depsPending || this.pending;
    if (!loading && !this.initialized) {
        // Generate a new promise
        return this.compute();
    } /* else if (this.initialized)
        If we are already initialized, and not pending, then returning the last
        promise is sufficient in the return below
    */

    return this.pendingPromise;
}

J.prototype.compute = function compute() {
    let aggregateData = {};
    let dependencyPromises = Object.keys(this.bindings).map(key =>
        this.bindings[key].yield().pass(
            // data => (log("key", key, "data", data), aggregateData[key] = data)
            data => aggregateData[key] = data
        )
    );
    let deferredPromise = () => {
        this.depsPending = true;
        return MaybeP.all(dependencyPromises)
            .then(
                () => {
                    this.depsPending = false;
                    this.pending = true;
                    this._notify('pending', call(true));
                    if (Object.keys(this.bindings).length)
                        return this.promiseFunc(aggregateData);
                    return this.promiseFunc();
                }
            ).pass(
                data => {
                    this.data = data;
                    if (!this.initialized) {
                        this.initialized = true;
                        this._notify('initialized', call(true));
                    }
                    this.pending = false;
                    this._notify('pending', call(false));
                    this._notify('default', call(data));
                    return data;
                }
            );
    };

    if (!this.pendingPromise) {
        this.pendingPromise = deferredPromise();
    } else {
        this.pendingPromise = this.pendingPromise.ignore(deferredPromise);
    }

    return this.pendingPromise;
};

J.prototype._notify = function _notify(event, cb) {

    let callbacks = this.subscriptions[event];
    if (event in this.specialSubscriptions) {
        callbacks = this.specialSubscriptions[event];
    }

    (callbacks || []).forEach(f => cb(f));
}
J.prototype.reload = function reload() {
    // Compute this.pendingPromise based on deps
    let updatedNodes = new WeakMap([[this, this.compute()]]);
    let nodesToUpdate = new Queue();
    let allDependees = this._allDependees();
    Array.from(allDependees)
        .filter(d => d.active)
        .forEach(d => nodesToUpdate.add(d));

    let i = 0;
    while (nodesToUpdate.length) {
        assert(i <= 1000, "Infinite loop detected!");
        let n = nodesToUpdate.remove();
        if (n.deps.every(d => !allDependees.has(d) || updatedNodes.has(d))) {
            // Only compute n, if its dependencies that are apart of the
            // subgraph we are reloading, have been reloaded
            updatedNodes.set(n, n.compute());
        } else {
            // Push the node to the end of the queue until we've computed its dependencies
            nodesToUpdate.add(n);
        }
        i++;
    }
    return this;
}

J.prototype._activateGraph = function _activateGraph() {
    if (this.active)
        return;
    this.deps.forEach(d => d._activateGraph());
    this.active = true;
    this._notify("active", call(true));
}

J.prototype._deactivateGraph = function _deactivateGraph() {
    if (!this.active)
        return;

    let toDeactivate = new Set([this]);

    // Explore dependencies that could be deactivated as a result of this
    // deactivation
    let exploreSet = new Set(this.deps);
    while (exploreSet.size) {
        let exploreSetValues = Array.from(exploreSet);
        exploreSetValues.forEach(node => {

            // We've already deactivated this node
            if (toDeactivate.has(node))
                return;

            let noActiveDependee = node.dependees.every(d => {
                let markedForDeactivate = toDeactivate.has(d);
                let isNotActive = !d.active;

                return markedForDeactivate || isNotActive;
            })


            let noSubscribers = !node._hasListeners();

            // Condition to mark node as not active
            if (noActiveDependee && noSubscribers) {

                // Mark to be deactivated
                toDeactivate.add(node);

                // Explore node's children
                node.deps.forEach(d => exploreSet.add(d));
            }

            // Don't explore this node anymore
            exploreSet.delete(node)
        })
    }

    for (let node of toDeactivate) {
        // Deactivate it
        node.active = false;
        node._notify("active", call(false));
    }
}

J.prototype.subscribe = function subscribe(event, f) {
    // Alias subscribe(f) to subscribe("default", f)
    if (!f) {
        f = event;
        event = "default"
    }

    if (event in this.specialSubscriptions) {
        this.specialSubscriptions[event].add(f);
        setTimeout(() => f(this.active));
        return this;
    }

    this.subscriptions[event].add(f);

    let totalSubscribers =
        Object.values(this.subscriptions).reduce((count, set) => count + set.size, 0)

    if (totalSubscribers == 1) {
        this._activateGraph();
    }

    // Here we handle what actions we need to take in case if this node is
    // stale, or in the middle of fetching

    let loading = this.depsPending || this.pending;

    // If we have an up to date value
    if (!loading && this.initialized && event == "default") {
        // Force f to be called asynchronously (i.e. when the stack is empty)
        setTimeout(() => f(this.data));
    } else if (!loading && !this.initialized) {
        // If we are neither pending nor initialized, kick off the jig!
        this.reload();
    } /*
        // We are already pending!
    */

    return this;
}

J.prototype.subscribeOnce = function subscribeOnce(event, f) {
    // Alias subscribe(f) to subscribe("default", f)
    if (!f) {
        f = event;
        event = "default"
    }
    let wrapper;
    return this.subscribe(event, wrapper = (data) => { f(data), this.unsubscribe(event, wrapper) });
}

J.prototype._hasListeners = function _hasListeners(event, f) {
   // True if some subscription...
   return Object.keys(this.subscriptions).some(event =>
       // Has a set of listeners of positive size
       this.subscriptions[event].size
   );
}

J.prototype.unsubscribeAll = function unsubscribe(event) {
    // Alias unsubscribe() to unsubscribe('default')
    if (!event) {
        event = "default"
    }
    this.subscriptions[event].forEach(f => this.unsubscribe(event, f));
    return this;
}
J.prototype.unsubscribe = function unsubscribe(event, f) {
    // Alias unsubscribe(f) to unsubscribe('default', f)
    if (!f) {
        f = event;
        event = "default"
    }

    this.subscriptions[event].delete(f);

    // Todo: this is horribly inefficient :(
    let noActiveDependee = Array.from(this._allDependees()).every(d => !d.active);
    if (!this._hasListeners() && noActiveDependee) {
        // Deactivate node, and all others that should be deactivated as result
        this._deactivateGraph();
    }
    return this;
}

J.prototype._allDependees = function _allDependees() {
    return this.dependees.reduce((set, d) => d.__allDependees(set), new Set());
}

J.prototype.__allDependees = function __allDependees(parentSet) {
    if (parentSet.has(this)) {
        return parentSet;
    }
    parentSet.add(this);
    return this.dependees.reduce((set, d) => d.__allDependees(set), parentSet);
}

J.prototype._postOrder = function _postOrder() {
    return this._postOrder(new Set())
}

J.prototype.__postOrder = function __postOrder(set) {
    if (set.has(this)) {
        return [];
    }
    set.add(this);
    let dependents = [].concat.apply([], Object.values(this.bindings).map(l => l.__postOrder(set)));
    return [ ...dependents, this ];
}

/*
Thoughts:
What does it mean to be resolved
What does pending mean? unresolved?
it doesn't have to be immutable, thats an easy extension

Requirements:
Lazy resolution of resources, F may have many dependencies constantly changing but we don't request a new F, unless it is asked for, or unless if it has subscribers (which represent things that are constantly asking in a way)

The ability to purge any dependency that affects all future requests

A node's dependencies share a consistent view of the graph. In the culiminating resolution of a node, once any node is resolved, all dependees will see that resolved version.

Implementation:
A Node is resolved, if it has already performed a fetch for the values of its current dependencies

Every resolved node corresponds to exactly one tree of nodes. It's not possible for their to be multiple versions of a dependency

*/
function assert(bool, str) {
    if (!bool) throw new Error(str);
}

// passThrough wraps a function, it calls the function but always returns the first
// argument to the wrapper.
// the return value. Use this to perform side effects on a promise, without
// altering the promise chain.
//
// Here's an example:
//
// Promise.resolve(42)
//     .then(passThrough((arg) => console.log(arg)))
//     .then(arg => /* arg is still 42 */)
//
function passThrough(f) {
    return function(arg) {
        f(arg);
        return arg;
    }
}

if (!Object.values) {
    Object.values = o =>
        Object.keys(o).map(k => o[k]);
}
function delay(f, ms) {
    return new Promise(res => setTimeout(() => res(f()), ms));
}

function Queue() {
    this.data = [];
    this.start = 0;
    this.length = 0;
    this.maxLength = 10;
}

Queue.prototype._increaseSize = function _increaseSize() {
    let data = [];
    for (let i = 0; i < this.length; i++) {
        let index = (this.start + i) % this.maxLength;
        data[i] = this.data[index];
    }
    this.data = data;
    this.start = 0;
    this.maxLength *= 2;
}

Queue.prototype.add = function add(val) {
    let insertIndex = (this.start + this.length) % this.maxLength;
    if (insertIndex in this.data) {
        this._increaseSize();
        return this.add(val);
    }
    this.length++;
    return this.data[insertIndex] = val;
}

Queue.prototype.remove = function remove() {
    if (this.length == 0)
        return;
    let removed = this.data[this.start];
    delete this.data[this.start];
    this.length--;
    this.start = (this.start + 1) % this.maxLength;
    return removed;
}

Queue.prototype.head = function head() {
    return this.data[this.start];
}

Queue.prototype.tail = function tail() {
    let index = (this.start + this.length - 1) % this.maxLength;
    return this.data[index];
}

function log() {
    console.log(...arguments);
}

function call() {
    let args = arguments;
    return f => f.apply(null, args);
}

class MaybeP {
    constructor(pmv) {
        this.value = pmv;
    }

    then(mfunc) {
        let pmval = this.value;
        return new MaybeP(new Promise(resolve =>
            pmval.then(mv => {
                return mv.isNone()
                ? resolve(mv)
                : mv.bind(v => mfunc(v).value.then(resolve))
            })
        ));
    }

    pass(func) {
        this.then(v => MaybeP.none(func(v)));
        return this;
    }

    ignore(mfunc) {
        let pmval = this.value;
        return new MaybeP(pmval.then(_ => mfunc().value));
    }
}

MaybeP.resolve = (value) => {
    return new MaybeP(Promise.resolve(value).then(v => Maybe.just(v)));
}
MaybeP.none = () => {
    return new MaybeP(Promise.resolve(Maybe.none()));
}
MaybeP.all = (pms) => {
    return new MaybeP(
        Promise.all(pms.map(pm => pm.value))
            .then(ms => Maybe.all(ms))
    );
}

class Maybe {
    constructor(type, value) {
        this.value = value;
        this.type = type;
    }
    bind(f) {
        if (this.type == Maybe.NoneType) {
            return this;
        }

        return f(this.value);
    }
    ignore(f) {
        return f();
    }
    isJust() {
        return this.type == Maybe.JustType;
    }
    isNone() {
        return this.type == Maybe.NoneType;
    }
}
Maybe.just = function(val) {
    return new Maybe(Maybe.JustType, val);
}
Maybe.none = function() {
    return new Maybe(Maybe.NoneType);
}
Maybe.all = function(mds) {
    // [ Maybe Data ] => Maybe [ Data ]
    return mds.reduce(
        (mArr, md) => mArr.bind(
            arr => md.bind(
                d => Maybe.just((arr.push(d), arr))
            )
        ),
        Maybe.just([])
    )
}

Maybe.JustType = Symbol("Just");
Maybe.NoneType = Symbol("None");

class SkippablePromise extends Promise {
}

SkippablePromise.all = function all([]) {
}

export default J;
export {
    Maybe,
    MaybeP,
    log,
};
