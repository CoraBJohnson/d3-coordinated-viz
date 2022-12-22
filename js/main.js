//first line wrap entire script in a self-executing anonymous function to move to local variable scope
(function() {

//pseudo global variables
    var attrArray = ['maxTemp', 'minTemp', 'averageTemp', 'precipitation', 'elevation']
    var expressed = attrArray[0];     //initial attribute

//chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

 //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([chartHeight - 10, 0])
        .domain([0, 88*1.1]); // csv first column max = 88

//begin script when window loads
    window.onload = setMap();

//set up choropleth map
    function setMap() {

        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 460;

        //create new svg container for the map
        var map = d3.select('body')
            .append('svg')
            .attr('class', 'map')
            .attr('width', width)
            .attr('height', height);

        //use projection method to creat projection generator
        //Albers equal area conic projection centered on North Carolina
        var projection = d3.geoAlbers()
            .center([1.2, 35.3])
            .rotate([81.1, 0, 0])
            .parallels([33, 78])
            .scale(4700)
            .translate([width / 2, height / 2]);

        //feed projection generator to create path generator
        var path = d3.geoPath()
            .projection(projection);

        //use promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv('data/NC_janData.csv'));    // load attributes from csv
        promises.push(d3.json('data/backgroundStates.topojson'));  //load background spatial data
        promises.push(d3.json('data/nc_counties.topojson'));  //load choropleth spatial data
        Promise.all(promises).then(callback);

        //console.log(promises);

        function callback(data) {
            csvData = data[0];
            states = data[1];
            nc = data[2];

            //console.log('data');
            //console.log(csvData);
            //console.log(nc);
            //console.log(states);

            //setGraticule(map, path);  //add graticule to map

            //translate topoJSONs
            var stateOutlines = topojson.feature(states, states.objects.backgroundStates).features;   //get array of features to pass to .data()
            var ncCounties = topojson.feature(nc, nc.objects.nc_counties).features;        //assign variable names to the features in the topojson data

            //console.log('stateOutlines and ncCounties:')
            //console.log(stateOutlines);
            //console.log(ncCounties);

            //add states to map using path generator. creates single svg element for states
            var otherStates = map.append('path')
                .datum(stateOutlines)
                .attr('class', "countries")
                .attr('d', path);

            //join csv data to enumeration units with function
            ncCounties = joinData(ncCounties, csvData);

            //create color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to map with function
            setEnumerationUnits(ncCounties, map, path, colorScale);

            //add chart visualization to map
            setChart(csvData, colorScale);

            //add dropdown
            //createDropdown(csvData);

        };
    }; //end of setMap()

//function to join data
function joinData(ncCounties, csvData) {
    //console.log(csvData)
    //console.log(csvData[1])

           //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.Name_ALT; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < ncCounties.length; a++) {

                var geojsonProps = ncCounties[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.Name_ALT; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        console.log("ncCounties")
        return ncCounties
        console.log(ncCounties)
            console.log("post")
        };

};

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
            "#FEF0D9",
            "#FDCC8A",
            "#FC8D59",
            "#E34A33",
            "#B30000"
    ];

    //color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    console.log(colorScale)

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax)

    console.log("colorscale" + colorScale)
    //console.log("quantiles")
    //console.log(colorScale.quantiles())
    return colorScale;
};

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

function setEnumerationUnits(ncCounties, map, path){
    //add enumeration units to map using .selectAll().data().enter()
    var counties = map.selectAll(".counties")
        .data(ncCounties)
        .enter()
        .append('path')
        .attr('class', function (d) {
            return "counties" + d.properties.NAME_ALT;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })

    var desc = counties.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');

};

//function to create coordinated bar chart

function setChart(csvData, colorScale) {

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bars for each county
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function (a, b) {
            return b[expressed] - a[expressed]
        })
        .attr("class", function (d) {
            return "bar " + d.Name_ALT;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
    //.on("mouseover", d3.highlight)
    //.on("mouseout", dehighlight)
    //.on("mousemove", moveLabel);

    //add style descriptor to each rect
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed[3] + " in each county");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);
};

//function to highlight enumeration units and bars
function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.Name_ALT)
            .style("stroke", "blue")
            .style("stroke-width", "2");

        setLabel(props);
    };


})();