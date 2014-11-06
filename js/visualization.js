//The width and height of the SVG display
var width = 850;
var height = 500;
var hospitalDetails = document.getElementById("hospital-details");
var colors;
var counties;
var hospitals;

//Scales are based on the display width and height
var x = d3.scale.linear()
    .domain([0, width])
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, height])
    .range([height, 0]);
   
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
          return "Average Covered Charges: " + (+d["Average Covered Charges"]).toFixed(2);
        });

var svg = d3.select("#canvas").append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom)
    .call(tip);

function showHospitalDetail(d) {
    console.log("detail: ", args);
    hospitalDetails.innerHTML = d;
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
        
        showRegions(filteredRecords);
        //showHospitals(filteredRecords);
    });
    
};

//Loads the topojson for the map. Calls back to load the data at the end.
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

function showRegions(hospitalsByRegion){
    var nestedByDrgData = d3.nest()
        .key(function(d){
            return d["Hospital Referral Region (HRR) Description"]
        })
        .rollup(function(d){
            return {
                "hospital_count": d.length,
                "average_covered_charges": d3.sum(d, function(d){ return +d["Average Covered Charges"]; }),
                "average_lat": d3.mean(d, function(d){ return d["Provider Latitude"]; }),
                "average_long": d3.mean(d, function(d){ return d["Provider Longitude"]; })
            }
        })
        .entries(hospitalsByRegion);

    var averageTotalPayments = nestedByDrgData.map(function(d){
        return +d.values["average_covered_charges"];
    });
    
    colors = d3.scale.quantize()
        .domain([d3.min(averageTotalPayments), d3.max(averageTotalPayments)])
        .range(colorbrewer.YlOrRd[9]);
        
    hospitals = svg.selectAll(".hospital").data(nestedByDrgData);

    hospitals.enter().append("circle")
        .attr("class", "hospital")               
        .attr("stroke-width", 1)
        .attr("stroke", "#000000")
        .style("opacity", 0.8)
        .append("svg:title")
        .text(function(d) { return d.values["hospital_count"]; });

    hospitals
        .attr("r", function(d){ return d.values["hospital_count"] * 5; }) 
        .attr("cx", function(d){
            var p = projection([
              d.values["average_long"],
              d.values["average_lat"]
            ]);
            //console.log(d.key, "cx", p[0]);
            return p[0];
        })
        .attr("cy", function(d){
            var p = projection([
              d.values["average_long"],
              d.values["average_lat"]
            ]);
            //console.log(d.key, "cy", p[1]);
            
            return p[1];
        })
        .style("fill", function(d){
            //console.log(colors(+d["Average Covered Charges"]), +d["Average Covered Charges"]);
            return colors(+d.values["average_covered_charges"]);
        })
        .select("title")
        .text(function(d) { return d.values["hospital_count"]; });
    
    hospitals.exit().remove();
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
            //console.log(d["Provider Name"], "cx", p[0]);
            return p[0];
        })
        .attr("cy", function(d){
            var p = projection([
              d["Provider Longitude"],
              d["Provider Latitude"]
            ]);
            //console.log(d["Provider Name"], "cy", p[1]);
            
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
    counties.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    
    var hospitals = svg.selectAll('.hospital');
    hospitals.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
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
}        