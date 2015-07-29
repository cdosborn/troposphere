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
    GraphController.prototype.switch = function(settings, cb) {
        var me = this;

        var key = {
            uuid: settings.uuid, 
            timeframe: settings.timeframe
        }
        var graphs = this.store.get(key);

        // Fetch data/build graphs for a timeframe
        if (graphs == undefined || settings.refresh) {
            var graphs = [["cpu", CPUGraph], ["mem", MemoryGraph], ["net", NetworkGraph]];
            graphs = graphs.map(function(data) {
                return new data[1]({ 
                    type: data[0], 
                    uuid: settings.uuid,
                    container: me.container,
                    timeframe: settings.timeframe
                })
            });

            me.store.set(key, graphs)
            me.timestamp = new Date();
            me.graphs.forEach(function(g){ g.hide(); })
            document.querySelector(".metrics > .loading").style.display = "inherit";

            graphs[0].create(function(){
                graphs[1].create(function() {
                    graphs[2].create(function() {
                        document.querySelector(".metrics > .loading").style.display = "none";
                        // me.graphs.forEach(function(g){ g.hide(); })
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

    return GraphController;
});
