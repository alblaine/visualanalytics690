//The width and height of the SVG display
var width = 850;
var height = 500;

//The DOM element that will contain hospital details
var hospitalDetails = document.getElementById("hospital-details");

//Colors will be populated by color brewer for scales
var colors;

var counties;
var hospitals;
var activeRegion = d3.select(null);

var nationalAverages;
var ncAverages;

//Scales are based on the display width and height
var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height])
    .range([height, 0]);

//Bar chart attributes
var barChartWidth = 260;
var barChartHeight = 270;

var barChartX = d3.scale.ordinal()
    .rangeRoundBands([0, barChartWidth], .1);
var barChartY = d3.scale.linear()
    .range([barChartHeight, 0]);

var xAxis = d3.svg.axis()
    .scale(barChartX)
    .orient("bottom");

String.prototype.toDollars = function(){
    return "$" + (+this).toFixed(2);    
};



//These settings set the NC map to be horizontally "flat", rather than
//appearing as on a globe
var projection = d3.geo.albers()
                    .scale(6500)
                    .rotate([91.6, 2, -6])
                    .translate([-width * 1.31, 0]);

var path = d3.geo.path().projection(projection);

var zoom = d3.behavior.zoom()
            .x(x)
            .y(y)
            .translate([0, 0])
            .scale(1)
            .scaleExtent([1, 8])
            .on("zoom", zoomed);

var tip = d3.tip()
        .attr('class', 'd3-tip')
        //.offset([-10, 0])
        .html(function(d) {
          return "Average Covered Charges: " + d["Average Covered Charges"].toDollars();
        });

var svg = d3.select("#canvas").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom)
    .call(tip);

function zoomToRegion(d) {
    if (activeRegion.node() === this){
        return resetZoomToRegion();    
    }
    
    activeRegion.classed("active", false);
    activeRegion = d3.select(this).classed("active", true);
    
    var bBox = this.getBBox();
    
    //var bounds = path.bounds(d);
    var dx = bBox.width; //bounds[1][0] - bounds[0][0];
    var dy = bBox.height; //bounds[1][1] - bounds[0][1];
    var x = bBox.x; //(bounds[0][0] + bounds[1][0]) / 2;
    var y = bBox.y; //(bounds[0][1] + bounds[1][1]) / 2;
    var scale = .9 / Math.max(dx / width, dy / height);
    var translate = [width / 2 - scale * x, height / 2 - scale * y];
    
    //[-793.5, -661] 4 should zoom to charlotte

console.log("zoomToRegion", dx, dy, x, y, scale, translate);
    
    scale = 4;
    translate = [-793.5, -661];
    
    zoom.translate(translate).scale(scale);
    
    /*svg.transition()
      .duration(750)
      //.style("stroke-width", 1.5 / scale + "px")
      .attr("transform", "translate(" + translate + ")scale(" + scale + ")");*/
    
}

function resetZoomToRegion() {
  activeRegion.classed("active", false);
  activeRegion = d3.select(null);

  resetZoom();
  /*g.transition()
      .duration(750)
      .style("stroke-width", "1.5px")
      .attr("transform", "");*/
}

/**
 * When the user clicks or taps on a hospital, the data for that hospital
 * appears in the hospital details DOM element, along with a bar graph to compare
 * NC and National averages with that hospital.
 */
function showHospitalDetail(d) {
    console.log("detail: ", d);
    
    //Get the hospital information from the clicked item
    var drgDefinition = d["DRG Definition"];
    /*
Average Covered Charges: "16355.16667"
Average Medicare Payments: "5092.583333"
Average Total Payments: "5863.25"
DRG Definition: "039 - EXTRACRANIAL PROCEDURES W/O CC/MCC"
Hospital Referral Region (HRR) Description: "NC - Asheville"
ID: "5"
Provider City: "HENDERSONVILLE"
Provider Id: "340017"
Provider Latitude: "35.3208531"
Provider Longitude: "-82.4677383"
Provider Name: "MARGARET R PARDEE MEMORIAL HOSPITAL"
Provider State: "NC"
Provider Street Address: "800 N JUSTICE ST"
Provider Zip Code: "28791"
Total Discharges: "12"
*/
    
    hospitalDetails.innerHTML = "";
    
    var title = document.createElement("div");
    title.className = "hospital-name";
    title.innerText = d["Provider Name"];
    
    hospitalDetails.appendChild(title);
    
    //TODO: need runtime check here to ensure data is available due to async call
    var nationalDataForThisDRG = nationalAverages.filter(function(d){
       return d["DRG Definition"] == drgDefinition; 
    });
    
    var ncDataForThisDRG = ncAverages.filter(function(d){
       return d["DRG Definition"] == drgDefinition; 
    });
    
    hospitalAverageCoveredCharges = d["Average Covered Charges"];
    
    nationalAverageCoveredCharges = nationalDataForThisDRG[0]["Average Covered Charges"];
    
    ncAverageCoveredCharges = ncDataForThisDRG[0]["Average Covered Charges"];
    
    var data = [
      { name: "Hospital", value: hospitalAverageCoveredCharges },
      { name: "North Carolina", value: ncAverageCoveredCharges },
      { name: "Nation", value: nationalAverageCoveredCharges }
    ];
    
    var barChart = d3.select("#hospital-details").append("svg")
        .attr("width", barChartWidth)
        .attr("height", barChartHeight + 30);
    
    barChartX.domain(data.map(function(d) { return d.name; }));
    barChartY.domain([0, d3.max(data, function(d) { return d.value; })]);
    
    barChart.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + barChartHeight + ")")
      .call(xAxis);
    
    var barWidth = (barChartWidth / data.length) - 10;
    
    /*var bar = barChart.selectAll("g")
        .data(data)
        .enter()
        .append("g")
            .attr("transform", function(d, i) { return "translate(" + i * (barWidth + 10) + ",0)"; });
    
    bar.append("rect")
      .attr("y", function(d) { return barChartY(d.value); })
      .attr("height", function(d) { return barChartHeight - barChartY(d.value); })
      .attr("width", barWidth - 1);*/
    
    barChart.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return barChartX(d.name); })
        .attr("y", function(d) { return barChartY(d.value); })
        .attr("height", function(d) { return barChartHeight - barChartY(d.value); })
        .attr("width", barChartX.rangeBand());
    
    barChart.selectAll(".bar-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "bar-label")
        .attr("x", function(d) { return barChartX(d.name) + (barWidth / 2); })
        .attr("y", function(d) { return barChartY(d.value) + 3; })
        .attr("dy", ".75em")
        .text(function(d) { return d.value.toDollars(); });
   
    console.log(data);
        
    //hospitalDetails.innerHTML = "This hospital: " + hospitalAverageCoveredCharges + "<br />NC Average: " + ncAverageCoveredCharges + "<br />National Average: " + nationalAverageCoveredCharges;
}

function hideHospitalDetail(d) {
    hospitalDetails.innerHTML = "";
}

//Load the data itself. Must be called after the topojson finishes loading.
function loadData(){
    d3.csv("data/inpatient_data_2012_nc_lat_long.csv", function(error, records){
        if (error) {
            return console.error(error);
        }
        
       // console.log(d3.min(averageTotalPayments), d3.max(averageTotalPayments));
        var nestedByDrgData = d3.nest()
            .key(function(d){
                return d["DRG Definition"];
            })
            .key(function(d){
                return d["Hospital Referral Region (HRR) Description"]
            })
            .entries(records);
        
        var keys = nestedByDrgData.map(function(d){
            return d.key;
        });
        
        //Populate the dropdown with the DRG codes.
        var list = d3.select("#drg-select").append("select");
        list.selectAll("option")
                .data(nestedByDrgData)
                .enter()
                .append("option")
                .attr("value", function(d){ return d.key; })
                .text(function(d){ return d.key; });
                
        list.on("change", function(d, i){
            var newDrg = this.selectedOptions[0].value;
            var filteredRecords = records.filter(function(d){
                return d["DRG Definition"] == newDrg;
            });
            
            //Reset the map before showing new points.
            resetZoom();
            
            showRegions(filteredRecords);                    
            //showHospitals(filteredRecords);                    
        });
        
        var firstCondition = keys[0];
        
        filteredRecords = records.filter(function(d){
           return d["DRG Definition"] == firstCondition;
        });
        
        //showRegions(filteredRecords);
        showHospitals(filteredRecords);
    });
    
};

function showRegions(hospitalsByRegion){
    var nestedByDrgData = d3.nest()
        .key(function(d){
            return d["Hospital Referral Region (HRR) Description"]
        })
        .rollup(function(d){
            var hospitalNames = "";
            for(h in d){
                hospitalNames += d[h]["Provider Name"] + ", "
            }
            return {
                "hospital_count": d.length,
                "average_covered_charges": d3.sum(d, function(d){ return +d["Average Covered Charges"]; }),
                "average_lat": d3.mean(d, function(d){ return d["Provider Latitude"]; }),
                "average_long": d3.mean(d, function(d){ return d["Provider Longitude"]; }),
                "hospitals": hospitalNames
            }
        })
        .entries(hospitalsByRegion);
        
    var averageTotalPayments = nestedByDrgData.map(function(d){
        return +d.values["average_covered_charges"];
    });
    
    colors = d3.scale.quantize()
        .domain([d3.min(averageTotalPayments), d3.max(averageTotalPayments)])
        .range(colorbrewer.YlOrRd[9]);
        
    regions = svg.selectAll(".region").data(nestedByDrgData);

    regions.enter().append("circle")
        //.attr("class", "region")
        .attr("class", function(d){ return "region " + d.key.toLowerCase().replace(/ /g, ""); })
        .attr("stroke-width", 1)
        .attr("stroke", "#000000")
        .style("opacity", 0.8)
        
        //.append("svg:title")
        //.text(function(d) { return d.values["hospital_count"]; });

    regions
        .attr("r", function(d){ return d.values["hospital_count"] * 7; }) 
        .attr("cx", function(d){
            var p = projection([
              d.values["average_long"],
              d.values["average_lat"]
            ]);
            return p[0];
        })
        .attr("cy", function(d){
            var p = projection([
              d.values["average_long"],
              d.values["average_lat"]
            ]);
            
            return p[1];
        })
        .style("fill", function(d){
            return colors(+d.values["average_covered_charges"]);
        })
        .on("click", zoomToRegion)
        .select("title")
        .text(function(d) { return d.values["hospital_count"]; });
            
    
    regions.exit().remove();
    
    regionLabels = svg.selectAll(".region-label").data(nestedByDrgData);
    
    regionLabels.enter()
        .append("text")
        .attr("class", function(d){
            return "region-label region-size-" + d.values["hospital_count"];
        });
    
    regionLabels
        .attr("transform", function(d) { return "translate(" + projection([
          d.values["average_long"],
          d.values["average_lat"]
        ]) + ")"; })
        .attr("dy", "0.35em")
        .attr("dx", "-.35em")
        .text(function(d){
            return d.values["hospital_count"];
        });
    
    regionLabels.exit().remove();    
}

function hideHospitals(){
    svg.selectAll(".hospital").style("opacity", 0);
}

function showHospitals(hospitals){
    
    var averageTotalPayments = hospitals.map(function(d){
        return +d["Average Covered Charges"];
    });
    
    colors = d3.scale.quantize()
        .domain([d3.min(averageTotalPayments), d3.max(averageTotalPayments)])
        .range(colorbrewer.YlOrRd[9]);
        
    hospitals = svg.selectAll(".hospital").data(hospitals);

    hospitals.enter().append("circle")
        .attr("class", "hospital")
        .attr("r", 7)                
        .attr("stroke-width", 1)
        .attr("stroke", "#000000")
        .style("opacity", 0.8)
        .append("svg:title")
        .text(function(d) { return d["Provider Name"]; });

    hospitals
        .attr("cx", function(d){
            
            var p = projection([
              d["Provider Longitude"],
              d["Provider Latitude"]
            ]);
            return p[0];
        })
        .attr("cy", function(d){
            var p = projection([
              d["Provider Longitude"],
              d["Provider Latitude"]
            ]);
            
            return p[1];
        })
        .style("fill", function(d){
            return colors(+d["Average Covered Charges"]);
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .on('click', showHospitalDetail)
        .select("title")
        .text(function(d) { return d["Provider Name"]; });
    
    hospitals.exit().remove();
}

function zoomed() {
//console.log(d3.event.translate, d3.event.scale);
    //svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    counties.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    
    var hospitals = svg.selectAll('.hospital');
    hospitals.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    
    var regions = svg.selectAll(".region");
    regions.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    
    var regionLabels = svg.selectAll(".region-label");
    regionLabels.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

//TODO: animate this zoom out
function resetZoom() {
    //Reset zoom translation and scale. 
    zoom.translate([0, 0]);
    zoom.scale(1);
    
    //Reset counties and hospital data positions.
    counties.attr("transform", "translate(0, 0)scale(1)");
    
    var hospitals = svg.selectAll('.hospital');
    hospitals.attr("transform", "translate(0, 0)scale(1)");
    
    var regions = svg.selectAll(".region");
    regions.attr("transform", "translate(0, 0)scale(1)");
    
    var regionLabels = svg.selectAll(".region-label");
    regionLabels.attr("transform", "translate(0, 0)scale(1)");
}

//Loads the topojson for the map. Calls back to load hospital data at the end.
d3.json("data/nc-counties-topo.json", function(error, states) {
  if (error) {
    return console.error(error);
  }
  
  var topo = topojson.feature(states, states.objects.counties).features;
  
  counties = svg.selectAll(".county").data(topo);
  
  counties.enter().insert("path")
    .attr("class", "county")
    .attr("d", path)
    .style("stroke", "#000")
    .style("fill", "#ccc");
    
    loadData();
});

//Load the National data.
d3.csv("data/National-Data-By-DRG.csv", function(error, data){
    if (error) {
        return console.error(error);
    }
    
    nationalAverages = data;
    
    //console.log("National averages loaded", nationalAverages);
});


//Load the NC summary data.
d3.csv("data/NC-DRG-Summary-Data.csv", function(error, data){
    if (error) {
        return console.error(error);
    }
    
    ncAverages = data;
    
    //console.log("NC averages loaded", ncAverages);
});