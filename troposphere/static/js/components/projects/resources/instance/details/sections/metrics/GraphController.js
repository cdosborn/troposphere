define(function(require) {

    // Metrics utils
    var Store = require('./Store'),
        CPUGraph = require('./CPUGraph'),
        MemoryGraph = require('./MemoryGraph'),
        NetworkGraph = require('./NetworkGraph');

    var GraphController = function(config) {
        this.container = config.container;
        this.store = new Store();
        this.graphs = [];
    }

    // GraphController.prototype.hide = function() {
    //     var durp = this.store.get(this.active)
    //     durp && durp.hide();
    // }
    GraphController.prototype.clearContainer = function() {
        var g = this.container;
        while (g.lastChild) {
            g.removeChild(g.lastChild);
        } 
    }
    GraphController.prototype.switch = function(uuid, timeframe, cb) {
        var me = this;
        var key = {uuid:uuid, timeframe:timeframe}
        var graphs = this.store.get(key)

        if (graphs == undefined) {
            var graphs = [["cpu", CPUGraph], ["mem", MemoryGraph], ["net", NetworkGraph]];
            graphs = graphs.map(function(data) {
                return new data[1]({ 
                    type: data[0], 
                    uuid: uuid,
                    container: me.container,
                    timeframe: timeframe
                })
            });

            me.store.set(key, graphs)

            graphs[0].create(function(){
                graphs[1].create(function() {
                    graphs[2].create(function() {
                        me.graphs.forEach(function(g){ g.hide(); })
                        graphs.forEach(function(g){ g.show(); })
                        me.graphs = graphs;
                    })
                })
            })
        } else {
            me.graphs.forEach(function(g){ g.hide(); })
            graphs.forEach(function(g){ g.show(); })
            me.graphs = graphs;
        }


    }
    // GraphController.prototype.type = function() {
    //     return this.active.type;
    // }
    // GraphController.prototype.refresh = function() {
    //     var cur = this.store.get({ 
    //         type: this.active.type, 
    //         uuid: this.active.uuid 
    //     });
    //     cur.fetch(function() {
    //         cur.clear(); 
    //         cur.make();
    //     })
    //     // this.switch(this.active.uuid, this.active.type, true);
    // }
    // GraphController.prototype.makeGraph = function(settings) {
    //     switch (settings.type) {
    //         case "cpu" : 
    //             return new CPUGraph(settings)
    //         case "mem" : 
    //             return new MemoryGraph(settings)
    //         case "net" : 
    //             return new NetworkGraph(settings)
    //     }
    // }

    return GraphController;
});
