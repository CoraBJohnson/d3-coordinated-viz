//first line wrap entire script in a self-executing anonymous function to move to local variable scope
(function() {

//pseudo global variables
    var attrArray = ['maxTemp', 'minTemp', 'averageTemp', 'precipitation', 'elevation']
    var expressed = attrArray[0];     //initial attribute

//begin script when window loads
    window.onload = setMap();

//set up choropleth map
    function setMap() {

        //map frame dimensions
        var width = 960,
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
            .rotate([81, 0, 0])
            .parallels([33, 78])
            .scale(7000)
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

        console.log(promises);

        function callback(data) {
            csvData = data[0];
            states = data[1];
            nc = data[2];

            console.log('data');
            console.log(csvData);
            console.log(nc);
            console.log(states);

            //setGraticule(map, path);  //add graticule to map

            //translate topoJSONs
            var stateOutlines = topojson.feature(states, states.objects.backgroundStates).features;   //get array of features to pass to .data()
            var ncCounties = topojson.feature(nc, nc.objects.nc_counties).features;        //assign variable names to the features in the topojson data

            console.log('stateOutlines and ncCounties:')
            console.log(stateOutlines);
            console.log(ncCounties);

            //add states to map using path generator. creates single svg element for states
            var otherStates = map.append('path')
                .datum(stateOutlines)
                .attr('class', "otherStates")
                .attr('d', path);

            //join csv dat to enumeration units with function
            ncCounties = joinData(ncCounties, csvData);

            //add enumeration units to map with function
            setEnumerationUnits(ncCounties, map,path);
        };
    };  // end of set map

    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];
        //color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of expressed attr
        var domainArray = [];
        for (var i=0; i<data.length; i++){
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };
        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };




        function joinData(ncCounties, csvData) {

            //variables for data join
            var attrArray = ['maxTemp', 'minTemp', 'averageTemp', 'precipitation', 'elevation'];

            // loop through csv file to assign csv values to geojson counties
            for (var i = 0; i < csvData.length; i++) {
                var csvCounty = csvData[i];           //properties of current csv record
                var csvKey = csvCounty.NAME_ALT;      //primary key of csv

                //loop through geojson counties to find correct county
                for (var a = 0; a < ncCounties.length; a++) {

                    var geojsonProps = ncCounties[a].properties;  //properties of the selected county
                    var geojsonKey = geojsonProps.NAME_ALT;       //primary key of the geojson

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey) {

                        //assign attributes and values. join csv data to spatial data
                        attrArr.forEach(function (attr) {
                            var val = parseFloat(csvRegion[attr]);    //get csv attribute float value
                            geojsonProps[attr] = val;      //assign attribute and value to geojson properties
                        });
                    }
                    ;
                }
                ;
            }
            ;
            console.log('joinData function ncCounties:');
            console.log(ncCounties);
            return ncCounties;
        };


        function setGraticule(map, path) {
            var graticule = d3.geoGraticule()        // create graticule generator
                .step([5, 5]);  //step for 5 degrees lon, lat grat lines

            var gratBack = map.append('path')  //append background to map using outline method
                .datum(graticule.outline())
                .attr('class', 'gratBack')     //class for css styling
                .attr('d', path)     //project graticule

            // draw graticule lines
            var gratLines = map.selectAll('.gratLines')
                .data(graticule.lines())
                .enter()
                .append('path')
                .attr("class", 'gratLines')
                .attr('d', path);
        };

        function setEnumerationUnits(ncCounties, map, path){
            //add enumeration units to map using .selectAll().data().enter()
            var counties = map.selectAll(".counties")
                .data(ncCounties)
                .enter()
                .append('path')
                .attr('class', function (d) {
                    return d.properties.NAME_ALT;
                })
                .attr("d", path);
        };
})();