define(function(require) {

    // fetch 10 hours,perSecond(stats.*.*51.tx), "sum" 
    // fetch(10, 60,"perSecond(stats.*.*51.tx)", function(a,b) 
    // var fetch = function(points, resolution, expression, callback) {
    //       var now, then, step, host;
    //       host = hyper_stats_url; // Global from django template

    //       now = Date.now();
    //       then = (now / 1000) - points * 60 * resolution  - 4 * 60 * resolution // add 4 more points

    //       // Apply the summarize, if resolution is greater than 1 (minute)
    //       if (resolution > 1) expression = "summarize(" + expression + ",'"
    //           + (!(resolution % 60) ? resolution / 60 + "hour" : resolution + "min")
    //           + "','avg')";

    //       var req = host + "/render?format=json"
    //       + "&target=" + encodeURIComponent(expression)
    //       + "&from=" + Math.floor(then)

    //       d3.text(req, function(text) {
    //         if (!text) return callback(new Error("unable to load data"));
    //         var json = JSON.parse(text);
    //         var data = json[0].datapoints.slice(1) // trim first
    //         data.length = points;                 // trim extra tail, in case 
    //         callback(null, data.map(function(arr) {
    //           return { x: arr[1] * 1000, y: arr[0] };
    //         }));
    //       });
    // }

    var fetch = function(uuid, urlParams, callback) {
        var api = API_V2_ROOT + "/metrics";

        // Request extra datapoints to account for occasional null data at
        // front/end
        var extra = 2;

        var req = api + "/" + uuid + ".json" +
            "?field=" + urlParams.field +
            "&res="   + urlParams.res   +
            "&size="  + (urlParams.size + extra);

        if (urlParams.fun)
            req += "&fun=" + urlParams.fun;

        d3.json(req)
            .header("Authorization", "Token " + access_token)
            .get(function(error, json) {

                if (!json) return callback(new Error("unable to load data"));
                var data = json[0].datapoints

                // Trim initial/final null values
                if (data[0][0] == null)
                    data.splice(1);
                data.length = urlParams.size;

                callback(null, data.map(function(arr) {
                    return { x: arr[1] * 1000, y: arr[0] };
                }));

                // console.log(req, data);
            })
    }


    var bytesToString = function (bytes) {
        var fmt = d3.format('.0f'),
            isNegative = bytes < 0,
            output = ""; 

        bytes = Math.abs(bytes);
        if (bytes < 1024) {
            output = fmt(bytes) + 'B';
        } else if (bytes < 1024 * 1024) {
            output = fmt(bytes / 1024) + 'kB';
        } else if (bytes < 1024 * 1024 * 1024) {
            output = fmt(bytes / 1024 / 1024) + 'MB';
        } else {
            output = fmt(bytes / 1024 / 1024 / 1024) + 'GB';
        }
        return isNegative ? "-" + output : output;
    }
    // var secondsToStringSince = function(start) {
    //     var secondsToString = function(seconds, i) { 
    //         var now = start;
    //         var diff = now - seconds + 60;
    //         var w = Math.floor(diff / (3600 * 24 * 7));
    //         var days = diff % (3600 * 24 * 7)
    //         var d = Math.floor(days / 3600 / 24);
    //         var hours = days % (3600 * 24)
    //         var h = Math.floor(hours / 3600)
    //         var mins = hours % 3600
    //         var m = Math.floor(mins / 60)
    //         var secs = mins % 60
    //         var s = secs//Math.floor(secs / 60)

    //         var labels = ["week","day","hour","minute", "second"];
    //         var data = [w,d,h,m,s];
    //         var result;

    //         data.some(function(d, i) {
    //             if (d > 0) {
    //                 result = d + " " + labels[i] + (d > 1 ? "s" : "") + " ago"
    //             }
    //             return d > 0;
    //         })
    //         return result || "0 seconds ago";
    //     }
    //     return secondsToString
    // }
    var get = function(name) { 
        return function(obj) {
          // console.log("INSIDE GET", "obj:", obj, "prop:", name);
          return obj[name];
        };
    };

    // var getAllUUIDS = function(callback) {
    //     host = "http://monarch.iplantc.org:8000";
    //     d3.json(host + "/metrics/find?format=completer&query=*.*.*.cpu", function(result) {
    //       if (!result) return callback(new Error("unable to find metrics"));
    //       callback(result.metrics.map(function(d) { return d.path.split(".")[2]; }));
    //     });
    // };

    return {
        get: get,
        fetch: fetch,
        bytesToString: bytesToString
    }
})

