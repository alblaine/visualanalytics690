//The width and height of the SVG display
var width = 850;
var height = 500;

//The DOM element that will contain hospital details
var hospitalDetails = document.getElementById("hospital-details");

//Colors will be populated by color brewer for scales
var colors;
var counties;
var hospitals;
var nationalAverages = null;
var ncAverages = null;
var drgMin = document.getElementById("drg-min");
var drgMax = document.getElementById("drg-max");

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

Number.prototype.toPercent = function(){
    return (this * 100).toFixed(2);  
};

//This sets the NC map to be horizontally "flat", rather than
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

//The tooltip that appears on hover
var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
          return d["Provider Name"] + "<br />Average Covered Charges: " + d["Average Covered Charges"].toDollars();
        });

var svg = d3.select("#canvas").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("id", "svgroot")
    .call(zoom)
    .call(tip);

/**
 * When the user clicks or taps on a hospital, the data for that hospital
 * appears in the hospital details DOM element, along with a bar graph to compare
 * NC and National averages with that hospital.
 */
function showHospitalDetail(d) {    
    //Get the hospital information from the clicked item
    var drgDefinition = d["DRG Definition"];
    
    hospitalDetails.innerHTML = "";
    
    var title = document.createElement("div");
    title.className = "hospital-name";
    title.innerText = d["Provider Name"];
    
    hospitalDetails.appendChild(title);
    
    var drgName = document.createElement("div");
    drgName.className = "drg-name";
    drgName.innerText = d["DRG Definition"];
    
    hospitalDetails.appendChild(drgName);
    
    //TODO: need runtime check here to ensure data is available due to async call
    while(nationalAverages == null){
        //Lazy noop; hold until nationalAverages loads
    }
    
    var nationalDataForThisDRG = nationalAverages.filter(function(d){
       return d["DRG Definition"] == drgDefinition; 
    });

    while(ncAverages == null){
        //Lazy noop; hold until ncAverages loads
    }
    
    var ncDataForThisDRG = ncAverages.filter(function(d){
       return d["DRG Definition"] == drgDefinition; 
    });
//ID,DRG Definition,Provider Id,Provider Name,Provider Street Address,Provider City,Provider State,Provider Zip Code,Hospital Referral Region (HRR) Description,Total Discharges,Average Covered Charges,Average Total Payments,Average Medicare Payments,Provider Latitude,Provider Longitude    
    console.log(ncAverages, nationalAverages);
    hospitalAverageCoveredCharges = d["Average Covered Charges"];
    ncAverageCoveredCharges = ncDataForThisDRG[0]["Average Covered Charges"];
    nationalAverageCoveredCharges = nationalDataForThisDRG[0]["Average Covered Charges"];
    
    var percentChangeNC = (hospitalAverageCoveredCharges - ncAverageCoveredCharges) / ncAverageCoveredCharges;
    var percentChangeNCTerm = (percentChangeNC < 0) ? "less" : "more";
    
    var percentChangeNational = (hospitalAverageCoveredCharges - nationalAverageCoveredCharges) / nationalAverageCoveredCharges;
    var percentChangeNationalTerm = (percentChangeNational < 0) ? "less" : "more";
    
    var percentChangeNCElement = document.createElement("div");
    percentChangeNCElement.className = percentChangeNCTerm;
    percentChangeNCElement.innerText = percentChangeNC.toPercent() + "% " + percentChangeNCTerm + " than NC average";
    
    hospitalDetails.appendChild(percentChangeNCElement);
    
    var percentChangeNationalElement = document.createElement("div");
    percentChangeNationalElement.className = percentChangeNationalTerm;
    percentChangeNationalElement.innerText = percentChangeNational.toPercent() + "% " + percentChangeNationalTerm + " than National average";
    
    hospitalDetails.appendChild(percentChangeNationalElement);    
    
    var data = [
      { name: "Hospital", value: hospitalAverageCoveredCharges },
      { name: "North Carolina", value: ncAverageCoveredCharges },
      { name: "Nation", value: nationalAverageCoveredCharges }
    ];
    
    var barChart = d3.select("#hospital-details").append("svg")
        .attr("class", "hospital-chart")
        .attr("width", barChartWidth)
        .attr("height", barChartHeight + 30);
        
    barChartX.domain(data.map(function(d) { return d.name; }));
    barChartY.domain([0, d3.max(data, function(d) { return +d.value; })]);
    
    barChart.append("g")
      .attr("class", "x-axis")
      .attr("transform", "translate(0," + barChartHeight + ")")
      .call(xAxis);
    
    var barWidth = (barChartWidth / data.length) - 10;
    
    barChart.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return barChartX(d.name); })
        .attr("y", function(d) { return barChartY(d.value); })
        .attr("height", function(d) { return barChartHeight - barChartY(+d.value); })
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
        
    var extraInfoElement = document.createElement("div");
    extraInfoElement.className = "extra-info";
    extraInfoElement.innerHTML = "Total Discharges: " + d["Total Discharges"];
    
    hospitalDetails.appendChild(extraInfoElement);
    
    //standard deviation for this DRG
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
        var list = d3.select("#drg-select")
                    .append("label")
                    .text("DRG: ")
                    .append("select");
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
            
            //showRegions(filteredRecords);                    
            showHospitals(filteredRecords);                    
        });
        
        var firstCondition = keys[0];
        
        filteredRecords = records.filter(function(d){
           return d["DRG Definition"] == firstCondition;
        });
        
        //showRegions(filteredRecords);
        showHospitals(filteredRecords);
    });
};

function showHospitals(hospitals){
    
    var averageTotalPayments = hospitals.map(function(d){
        return +d["Average Covered Charges"];
    });
    
    var hospitalLocations = hospitals.map(function(d){
        var p = projection([
              d["Provider Longitude"],
              d["Provider Latitude"]
            ]);
        return [p[0], p[1]];
    });

    var minPayment = d3.min(averageTotalPayments);
    var maxPayment = d3.max(averageTotalPayments);
    
    drgMin.innerText = minPayment.toString().toDollars();
    drgMax.innerText = maxPayment.toString().toDollars();
    
    var svgroot = document.getElementById("svgroot");
    
    colors = d3.scale.quantize()
        .domain([minPayment, maxPayment])
        .range(colorbrewer.Blues[9]);
        
    hospitals = svg.selectAll(".hospital").data(hospitals);

    hospitals.enter().append("circle")
        .attr("class", "hospital")
        .attr("id", function(d){ return d["Provider Name"].toLowerCase().replace(/ /g, "-"); })
        .attr("r", 9)                
        .attr("stroke-width", 1)
        .attr("stroke", "#000000")
        .style("opacity", 0)
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
        .transition()
            .delay(200)
            .duration(800)
            .style("opacity", 0.8)
        .select("title")
        .text(function(d) { return d["Provider Name"]; });
    
    hospitals.exit()
            .transition()
                .duration(300)
				.style("opacity", 0)
            .remove();
    
    svg.selectAll(".hospital")
        .attr("cx", function(d, i){
            var id = d["Provider Name"].toLowerCase().replace(/ /g, "-");
            var bBoxRect = this.getBBox();
            var p = projection([
              d["Provider Longitude"],
              d["Provider Latitude"]
            ]);
            
            var intersectionList = svgroot.getIntersectionList(bBoxRect, null);
            for(var key in intersectionList){
                var item = intersectionList[key];
                if (typeof item.getAttribute == "function") {
                    var itemId = intersectionList[key].getAttribute("id");
                    if (itemId != null && itemId != id) {
                        //this item is intersecting another item, not just itself
                        var intersectingBBox = intersectionList[key].getBBox();
                        var x1 = bBoxRect["x"];
                        var x2 = intersectingBBox["x"];
                        
                        if (x2 > x1) {
                            p[0] = p[0] - 12;
                        } else {
                            p[0] = p[0] + 12;
                        }
                        //console.log("hit: ", bBoxRect, intersectionList[key].getBBox());
                        //p[0] = p[0] + moveDistance;
                    }
                }
            }
            
            return p[0];            
        });
    
}

function zoomed() {
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
});


//Load the NC summary data.
d3.csv("data/NC-DRG-Summary-Data.csv", function(error, data){
    if (error) {
        return console.error(error);
    }
    
    ncAverages = data;
});