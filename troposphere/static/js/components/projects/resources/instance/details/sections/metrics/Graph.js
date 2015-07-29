define(function(require) {

    var d3 = require("d3");
    var Utils = require("./Utils");

    var Graph = function(config) {
        config = config || {};

        switch (config.timeframe) {
            // this.points * this.resolution == 60
            case "1 hour":
                this.points = 60;
                this.resolution = 1;
                break;
            // this.points * this.resolution == 60 * 24
            case "1 day":
                this.points = 6 * 24;
                this.resolution = 10;
                break;
            // this.points * this.resolution == 60 * 24 * 7
            case "1 week":
                this.points = 24 * 7;
                this.resolution = 60;
                break;
        }

        var defaults = {
            data: [],
            width: 610,
            height: 100
        }

        for (prop in config) {
            this[prop] = config[prop];
        }
        for (prop in defaults) {
            if (config[prop] == undefined) {
                this[prop] = defaults[prop];
            }
        }

        this.element = document.createElement("div");
        this.element.style.display = "none";
        this.container.appendChild(this.element);
    }

    Graph.prototype = {};

    Graph.prototype.create = function(cb) {
        var me = this;
        this.fetch(function(){ 
            me.make()
            cb && cb();
        });
    }
    Graph.prototype.hide = function() {
        this.element.style.display = "none";
    }
    Graph.prototype.show = function() {
        this.element.style.display = "inline";
    }
    Graph.prototype.clear = function() {
        var g = this.element;
        while (g.lastChild) {
            g.removeChild(g.lastChild);
        } 
    }
    Graph.prototype.fetch = function(cb) {
        var me = this;
        var urlParams =  {
            field: this.type,
            res: this.resolution,
            size: this.points,
        }

        if (this.transform == "derivative") {
            urlParams.fun = "perSecond";
        }

        Utils.fetch(this.uuid, urlParams, function(err, data) {
            me.data = data;
            cb();
        });
    }

    Graph.prototype.make = function() {
          var me = this;
          var data = this.data
          var graphDom = this.element;
            
          var yAxisWidth = 50,
              margin = {top: 10, right: 20, bottom: 5, left: yAxisWidth},
              width = this.width - margin.left - margin.right,
              height = this.height - margin.top - margin.bottom;

          getX = Utils.get("x"); 
          getY = Utils.get("y"); 

          var yMax = d3.max(data, getY) || 0;
          var yMean = d3.mean(data, getY) || 0;
          var xMax = d3.max(data, getX);
          var xMin = d3.min(data, getX);
          
          var x = d3.scale.linear()
              .range([0, width])
              .domain(d3.extent(data, getX));

          var y = d3.scale.linear()
              .range([height, 0])
              .domain([0, 1]);//yMax * 1.2]);

          var line = d3.svg.line()
              //.interpolate("basis")
              .x(function(d) { return x(d.x); })
              .y(function(d) { return y(d.y); });

          var area = d3.svg.area()
              //.interpolate("basis")
            .x(function(d) { return x(d.x); })
            .y0(height)
            .y1(function(d) { return y(d.y); });

          var svg = d3.select(graphDom).append("svg")
                .attr("width", me.width)
                .attr("height", me.height)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

          svg.append("path")
            .datum([
                { x: xMin, y: yMean },
                { x: xMax, y: yMean }
            ])
            .style("stroke-dasharray", ("3, 3"))
            .attr("class", "metrics mean line")
            .attr("d", line)

          svg.append("path")
            .datum(data)
            .attr("class", "metrics rx area")
            .attr("d", area)

          svg.append("path")
            .datum(data)
            .attr("class", "metrics rx line")
            .attr("d", line)

          var yAxis = d3.svg.axis()
              .tickFormat(d3.format(".0%"))
              .tickValues([0, 1 /*yMean, yMax*/])
              .scale(y)
              .orient("left");

          svg.append("g")
            .attr("class", "metrics y axis")
            .call(yAxis)

          svg.append("text")
            .attr("class", "metrics x axis")
            .attr("style", "text-anchor:end")
            .attr("x", width)
            .attr("y", 0)
            .attr("dy", ".32em")
            .text( me.type == "cpu" ? "cpu usage": "memory usage")
    }

    return Graph;

})
