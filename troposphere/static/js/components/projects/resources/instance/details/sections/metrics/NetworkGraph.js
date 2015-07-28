define(function(require) {

   var d3 = require("d3");
   var Graph = require("./Graph");
   var Utils = require("./Utils");

    var NetworkGraph = function(settings) {
        var defaults = {
          type : "net",
          upper : {
            query: "*.*." + settings.uuid + ".rx",
            type: "rx",
            data: [],
            transform: "derivative",
          },
          lower : {
            query: "*.*." + settings.uuid + ".tx",
            type: "tx",
            data: [],
            transform: "derivative",
          }
        }

        for (prop in defaults) {
            this[prop] = defaults[prop];
        }

        for (prop in settings) {
            this[prop] = settings[prop];
        }

        Graph.call(this, settings);
    };

    NetworkGraph.prototype = Object.create(Graph.prototype);
    NetworkGraph.prototype.constructor = NetworkGraph;

    NetworkGraph.prototype.fetch = function(cb) {
        var me = this;
        var series = [ this.upper, this.lower ];

        series.forEach(function(s) { 
            s.urlParams = {
                field: s.type,
                res: me.resolution,
                size: me.points,
            };

            if (s.transform == "derivative")
                s.urlParams.fun = "perSecond";
            else
                s.urlParams.fun = "";
        });

        // console.log("uuid?", series[0]);
        // console.log("me?", this);
        Utils.fetch(me.uuid, series[0].urlParams, function(err, data) {
          series[0].data = data;
          Utils.fetch(me.uuid, series[1].urlParams, function(err, data) {
            series[1].data = data;
            cb.call(me);
          }) 
        }) 
    }

    NetworkGraph.prototype.make = function() {
          var me = this;
          var graphDom = me.element;
          var data = me.lower.data;
          var rxData = me.upper.data;
          var txData = me.lower.data;
            
          var yAxisWidth = 50,
              // margin = {top: 5, right: 20, bottom: 50, left: yAxisWidth},
              // margin = {top: 10, right: 20, bottom: 30, left: yAxisWidth},
              margin = {top: 10, right: 0, bottom: 5, left: yAxisWidth},
              width = this.width - margin.left - margin.right,
              height = this.height - margin.top - margin.bottom;

          var yMax = d3.max([ d3.max(rxData, getY)
                            , d3.max(txData, getY)
                           , 1.2 * 1024]) || 0;
          var yMeanUpper = d3.max([ d3.mean(rxData, getY)
                           , d3.mean(rxData, getY)]) || 0;
          var yMeanLower = d3.max([ d3.mean(txData, getY)
                           , d3.mean(txData, getY)]) || 0;


          var xMax = d3.max(data, getX);
          var xMin = d3.min(data, getX);

          var x = d3.time.scale()
              .range([0, width])
              .domain(d3.extent(data, getX));

          var y = d3.scale.linear()
              .range([height, 0])
              .domain([-1.2 * yMax,  1.2 * yMax]);

          var line = d3.svg.line()
              //.interpolate("basis")
              .x(function(d) { return x(d.x); })
              .y(function(d) { return y(d.y); });

          var lineSim = d3.svg.line()
              //.interpolate("basis")
              .x(function(d) { return d.x; })
              .y(function(d) { return d.y; });


          var area = d3.svg.area()
              //.interpolate("basis")
            .x(function(d) { return x(d.x); })
            .y0(height/2)
            .y1(function(d) { return y(d.y); });

          var lineReflect = d3.svg.line()
              //.interpolate("basis")
              .x(function(d) { return x(d.x); })
              .y(function(d) { return - y(d.y); });

          var areaReflect = d3.svg.area()
              //.interpolate("basis")
            .x(function(d) { return x(d.x); })
            .y0(height/2)//
            .y1(function(d) { return -y(d.y) + height; })

          var svg = d3.select(graphDom).append("svg")
                .attr("width", me.width)
                .attr("height", me.height + 40)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                // .on("mousemove", mousemove) 
                // .on("mouseover", function() { focus.style("display", null); })
                // .on("mouseout", function() { focus.style("display", "none"); });

          svg.append("path")
            .datum([
                { x: xMin, y: yMeanUpper },
                { x: xMax, y: yMeanUpper }
            ])
            .style("stroke-dasharray", ("3, 3"))
            .attr("class", "metrics mean line")
            .attr("d", line)

          svg.append("path")
            .datum([
                { x: xMin, y: -yMeanLower },
                { x: xMax, y: -yMeanLower }
            ])
            .style("stroke-dasharray", ("3, 3"))
            .attr("class", "metrics mean line")
            .attr("d", line)

          //svg.on("mousemove", function(){})

          svg.append("path")
            .datum(rxData)
            .attr("class", "metrics rx area")
            .attr("d", area);

          svg.append("path")
            .datum(rxData)
            .attr("class", "metrics rx line")
            .attr("d", line);

          svg.append("path")
            .datum(txData)
            .attr("class", "metrics tx area")
            .attr("d", areaReflect);

          svg.append("path")
            .datum(txData)
            .attr("class", "metrics tx line")
            .attr("d", lineReflect)
            .attr("transform", "translate(0," + height + ")")

          var yTick = Math.max(1024, yMax)
          var yAxis = d3.svg.axis()
              .tickFormat(function(d){ 
                  return Utils.bytesToString(Math.abs(d)); 
              })
              .tickValues([ -yTick, yTick, 0 /*yMeanUpper, -yMeanLower*/])
              .scale(y)
              .orient("left");

          var xAxis = d3.svg.axis()
              .scale(x)
              .orient("bottom")

          var total_mins = this.resolution * this.points;
          switch (total_mins) {
              case 60:
                  xAxis
                      .ticks(6)
                      .tickFormat(function(){
                          return d3.time.format("%_I:%M%p")
                                        .apply(d3.time, arguments)
                                        .toLowerCase()
                      })
                  break;  
              case 60 * 24:
                  xAxis
                      .ticks(12)
                      .tickFormat(function(){
                          return d3.time.format("%_I%p")
                                        .apply(d3.time, arguments)
                                        .toLowerCase()
                      })
                  break;  
              case 60 * 24 * 7:
                  xAxis
                      .ticks(7)
                      .tickFormat(d3.time.format("%a"))
                  break;
          }

          svg.append("g")
            .attr("class", "metrics y axis")
            .call(yAxis)

          svg.append("g")
            .attr("transform", "translate(0," + (height + margin.top + 15) +  ")")
            .attr("class", "metrics x axis")
            .call(xAxis)

          svg.append("text")
            .attr("class", "metrics x axis")
            .attr("style", "text-anchor:end")
            .attr("x", width)
            .attr("y", 0)
            .attr("dy", ".32em")
            // .attr("transform", "translate(" + (0.5 * width) + "," + (height + margin.top + 15) +  ")")
            .text(me.upper.type)

          svg.append("text")
            .attr("class", "metrics x axis")
            .attr("style", "text-anchor:end")
            .attr("x", width)
            .attr("y", height)
            .attr("dy", ".32em")
            // .attr("transform", "translate(" + (0.5 * width) + "," + (height + margin.top + 15) +  ")")
            .text(me.lower.type)

          // focus = svg.append("path")
          //   .datum([
          //           { x: 0, y: height },
          //           { x: 0, y: 0 },
          //   ])
          //   .style("display", "none")
          //   .attr("class", "metrics x axis line")
          //   .attr("d", lineSim);

          // function mousemove(){
          //     //console.log(d3.mouse(this)[0])
          //     focus.attr("transform", "translate(" + Math.max(0, d3.mouse(this)[0]) + ",0)")
          // }

          // svg.append("text")
          //   .attr("class", "metrics x axis")
          //   .attr("style", "text-anchor:middle")
          //   .attr("transform", "translate(" + (0.5 * width) + "," + (height + margin.top + 15) +  ")")
          //   .text(secondsToStringSince(data[data.length - 1].x)(data[0].x))
    }

    return NetworkGraph;
})
