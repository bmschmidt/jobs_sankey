var duration = 0;
var units = "People";

var margin = {top: 10, right: 30, bottom: 30, left: 20};

var width=window.innerWidth-margin.left-margin.right;
//start at 3,000 in height to catch everything; we'll shrink down on the update.
var height=3000;

var formatNumber = d3.format(",.0f"),    // zero decimal places
    format = function(d) { return formatNumber(d) + " " + units; },
    color = d3.scale.category20();

// append the svg canvas to the page
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

var linkset = svg.append("g").attr("id","linkSet")
// Set the sankey diagram properties
var state;

//the names of the columns that will be used in the Sankey.

var nodeNames = ["field","occupation"]
var countName = "count"
var lastData = []

defaultPath = {'x':0}


relayout = function(maindata,filter) {

    filter = filter || function() {return true}
    var data = maindata.filter(filter)
    //dat = data
    //Drop the exiting selections from last time

    var graph = dataToNodeList(data)

    //here is goes.

    //make the new data frame

    var sankey = d3.sankey()
        .nodeWidth(42)
        .nodePadding(6)
        .size([width, height]);

    sankey
        .nodes(graph.nodes)
        .links(graph.links)
        .layout(32);

    path = sankey.link();

    linkColor = d3.scale.log().domain([.1,1,10]).range(["red","grey","blue"])

    //add in the links.

    var link = linkset.selectAll(".link")
        .data(graph.links,function(d) {return d.source.name + "-" + d.target.name})

    resetSizeDown = function() {
        height = window.innerHeight*.9
	d3.select("svg").transition().duration(duration).attr("height",window.innerHeight)
        svg.attr("height",window.innerHeight*.9)
        sankey.size([width,height])
    }

    link
        .enter()
        .append("path")
        .style("stroke",function(d) {return linkColor(d.diff)})
        .attr("class", "link")
        .attr("d",function(d) {
	    try {return path(defaultPath)} 
	    catch(e) {return path(d)} 
	})
        .style("opacity",0)
        .style("stroke-width", function(d) { return Math.max(1, defaultPath.dy); })
        .on("click",function(d) {
            resetSizeDown()
            defaultPath = d
            relayout(maindata,filter=function(e) {
                return e.field==d.source.name || e.occupation==d.source.name || e.field==d.target.name || e.occupation==d.target.name
            })
        })
        .append("title")
        .text(function(d) {
            return d.source.name + " majors going into " +
                d.target.name + "\n" + format(d.value) + " (" +  .01*Math.round(d.diff*100) + " times as many as expected based on counts)"; });

    link
        .transition()
	.duration(duration)
        .style("opacity",.9)
        .attr("d",path)
        .style("stroke-width", function(d) { return Math.max(1, d.dy); })

        .sort(function(a, b) { return b.dy - a.dy; })

    link.exit().remove()
    // add the link titles

    // add in the nodes
    var node = svg.selectAll(".node")
        .data(graph.nodes,function(d) {return d.name})

    entering = node.enter()
        .append("g")


    entering
        .attr("transform", function(d) {
            try {
                d.relative = defaultPath.source.x===d.x?
                    defaultPath.source : defaultPath.target;
            } catch(error) {
		d.relative = d
            }
            return "translate(" + d.x + "," + d.relative.y + ")";

	})
    .attr("class", "node")

entering
    .append("title")
    .append("text")
    .text(function(d) {
        return d.name + "\n" + format(d.value); })

entering
    .append("rect")
    .on("click",function(d) {
        resetSizeDown()
        defaultPath = link.filter(function(e) {
            return e.source.name==d.name || e.target.name==d.name
        }).datum()
	relayout(maindata,filter=function(e) {
            return e.field==d.name || e.occupation==d.name
        })
    })
    .style("fill", function(d) {
        return d.color = industryColors(d.name.split("-")[0])
        return d.color = color(d.name.replace(/ .*/, "")); })
    .style("stroke", function(d) {
        return d3.rgb(d.color).darker(2); })
    .attr("height", function(d) { return d.relative.dy; })
    .style("opacity",0)

entering.append("text")
    .attr("class","label")
    .attr("x", -6)
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("font-size","11px")
    .attr("transform", null)
    .text(function(d) { return d.name; })
    .filter(function(d) { return d.x < width / 2; })
    .attr("x", 6 + sankey.nodeWidth())
    .attr("text-anchor", "start")

node
    .transition()
    .duration(duration)
    .attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")"; })

// add the rectangles for the nodes
node
    .selectAll("rect")
    .transition()
    .duration(duration)
    .style("opacity",1)
    .attr("height", function(d) {return d3.max([2,this.parentNode.__data__.dy])})
    .attr("width", sankey.nodeWidth())


d3
    .selectAll("text.label")
    .transition().duration(duration)
    .attr("y", function(d) { return this.parentNode.__data__.dy / 2; })


node.exit().remove()
// add in the title for the nodes

    //longer durations for all the later things.
    duration=2000
}
// load the data
d3.tsv("data.tsv", function(error, data) {
    var dat = data
    industries = d3.set(dat.map(function(d) {return d.occupation.split("-")[0]})).values()
    industryColors = d3.scale.category20().domain(industries)
    //from http://www.d3noob.org/2013/02/formatting-data-for-sankey-diagrams-in.html
    relayout(data,filter=function(d) {return true})
});


//functions


dataToNodeList = function(data) {
    var graph = {"nodes" : [], "links" : []};
    data.forEach(function (d) {
        nodeNames.forEach(function(name) {
            //add a node for each relevant column
            graph.nodes.push({ "name": d[name] });
        })
        graph.nodes.push({ "name": d.occupation });
        graph.links.push({ "source": d.field,
                           "target": d.occupation,
                           "value": d.count,
                           //diff is an optional value: I'm using to store the
                           //color of the node.
                           "diff":d.diff}
                        );
    });
    // return only the distinct / unique nodes
    graph.nodes = d3.keys(d3.nest()
                          .key(function (d) { return d.name; })
                          .map(graph.nodes));

    // loop through each link replacing the text with its index from node
    graph.links.forEach(function (d, i) {
        graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
        graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
    });



    //now loop through each nodes to make nodes an array of objects
    // rather than an array of strings
    graph.nodes.forEach(function (d, i) {
        graph.nodes[i] = { "name": d };
    });
    return graph
}
