Session.set("selectedPos", null);
Session.set("selectedPlan", null);

Meteor.subscribe("plans");

// Use jquery to get the position clicked relative to the map element.
var coordsRelativeToElement = function (element, event) {
  var offset = $(element).offset();
  var x = event.pageX - offset.left;
  var y = event.pageY - offset.top;
  return { x: x, y: y };
};

//plans
Template.plans.helpers({
  flightplans: function() {
    return Plans.find({});
  },
  selected: function() {
    return Session.get("selectedPlan");
  }
});

Template.plans.events({
  'click a': function(evt, tmpl) {
    console.log("select plan: ", this);
    Session.set("selectedPlan", this._id);
  }
});

//editor
Template.editor.helpers({
  code: function() {
    var plan = getPlan(Session.get("selectedPlan"));
    var code = 'var arDrone = require("ar-drone");\nvar client = arDrone.createClient();\n\nclient.takeoff()';

    if(plan) {
      code = code + ";\n\nclient";

      console.log("code generated");

      plan.path.forEach(function(conn) {
        code = code + ".after(" + conn.distance + ", function() { this.clockwise(" + conn.angle + "); })\n";
      });
    }
    return code.substring(0, code.lastIndexOf("\n")) + ";";
  }
});

Template.editor.events({
  'click circle': function() {
    console.log("circle selected: ",this);
  },
  'click .map': function(evt, tmpl) {
    var point = coordsRelativeToElement(evt.currentTarget, evt);
    Session.set("selectedPos", point);
  },
  'dblclick .map': function(evt, tmpl) {
    var plan = getPlan(Session.get("selectedPlan"));
    var point = coordsRelativeToElement(evt.currentTarget, evt);

    var lastConn = plan.path[plan.path.length - 1] || {idx: 0, to: new Position(0,0)};
    var newConn = new Connection(lastConn.idx, lastConn.to, new Position(point.x, point.y));

    var newPath = plan.path;
    newPath.push(newConn);

    Plans.update(plan._id, {$set: {path: newPath}});
  }
});

Template.editor.rendered = function () {
  var self = this;
  var svg = self.find("svg");

  console.log("editor rendered");

  Deps.autorun(function() {
    var plan = getPlan(Session.get("selectedPlan"));
    var selectedPos = Session.get("selectedPos");
    if(plan && plan.path.length > 0) {
      console.log("repaint map: ", plan);

      // Draw a circle for each connection
      var updateConnections = function (group) {
        group.attr("id", function (conn) { return conn.idx; })
        .attr("cx", function (conn) { return conn.to.x; })
        .attr("cy", function (conn) { return conn.to.y; })
        .attr("r", 10)
        .attr("class", function (conn) {
          return "public";
        })
        .style('opacity', function (conn) {
          return 1;
        });
      };

      var connections = d3.select(svg).select(".connections").selectAll("circle")
      .data(plan.path, function (conn) { return conn.idx; });

      updateConnections(connections.enter().append("circle"));
      updateConnections(connections.transition().duration(250).ease("cubic-out"));
      connections.exit().transition().duration(250).attr("r", 0).remove();

      //Draw a path
      var updatePath = function(group) {
        var line = d3.svg.line()
          .x(function(d) { return d.x; })
          .y(function(d) { return d.y; })
          .interpolate("basis");

        group.attr("d", function(d) { return line(d); });
      };

      var pathData = [];
      var currentEndPos;
      for(var i = 0; i < plan.path.length; i++) {
        var conn = plan.path[i];
        var pathPoints = [
          {x: conn.from.x, y: conn.from.y},
          {x: conn.to.x, y: conn.to.y}
        ];

        currentEndPos = {x: conn.to.x, y: conn.to.y};

        pathData.push(pathPoints);
      }

      //selection based last tmp connection
      if(selectedPos) {
        pathData.push([
            {x: currentEndPos.x, y: currentEndPos.y},
            {x: selectedPos.x, y: selectedPos.y}
          ]);
      }

      //todo evaluate if really neccessary to delete all paths first
      d3.select(svg).select(".path").selectAll("path").remove();

      var path = d3.select(svg).select(".path").selectAll("path")
      .data(pathData);

      updatePath(path.enter().append("svg:path"));
      path.exit();

      // Draw a dashed circle around the currently selected pos, if any
      var callout = d3.select(svg).select("circle.callout")
        .transition().duration(250).ease("cubic-out");
      if (selectedPos)
        callout.attr("cx", selectedPos.x)
        .attr("cy", selectedPos.y)
        .attr("r", 20)
        .attr("class", "callout")
        .attr("display", '');
      else
        callout.attr("display", 'none');
    }
  });


  $('pre code').each(function(i, e) {hljs.highlightBlock(e);});
};