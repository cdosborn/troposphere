define(function(require) {

    // Metrics utils
    var Store = require('./Store'),
        CPUGraph = require('./CPUGraph'),
        MemoryGraph = require('./MemoryGraph'),
        NetworkGraph = require('./NetworkGraph');

    var GraphController = function(config) {
        this.container = config.container;
        this.store = new Store();
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
        var graphs = [["cpu", CPUGraph], ["mem", MemoryGraph], ["net", NetworkGraph]];
        graphs = graphs.map(function(data) {
            return new data[1]({ 
                type: data[0], 
                uuid: uuid,
                container: me.container,
                timeframe: timeframe
            })
        });

        var c = me.container;
        while (c.childElementCount > 3)
            c.removeChild(c.firstChild);

        graphs[0].create(function(){
            graphs[1].create(function() {
                graphs[2].create(function() {
                    graphs[0].show()
                    graphs[1].show()
                    graphs[2].show()
                })
            })
        })
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
