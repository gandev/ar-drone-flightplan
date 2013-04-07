Meteor.subscribe("plans");

Session.set("currentPos", null);
Session.set("selectedPos", null);
Session.set("selectedPlan", null);

// Use jquery to get the position clicked relative to the map element.
var coordsRelativeToElement = function (element, event) {
  var offset = $(element).offset();
  var x = event.pageX - offset.left;
  var y = event.pageY - offset.top;
  return { x: x, y: y };
};

//plans - Template Section
Template.plans.helpers({
  flightplans: function() {
    return Plans.find({});
  },
  selected: function() {
    return Session.get("selectedPlan");
  },
  active: function() {
    var plan = this;
    if(plan._id === Session.get("selectedPlan")) {
      return "active";
    } else {
      return "";
    }
  },
  show: function() {
    return "active";
  }
});

Template.plans.events({
  'click a': function(evt) {
    Session.set("selectedPlan", this._id);
  }
});

Template.plans.rendered = function() {
  var selectedPlan = Session.get("selectedPlan");
  if(!selectedPlan) {
    var plan = Plans.findOne({});
    if(plan) {
      Session.set("selectedPlan", plan._id);
    }
  }
};

//editor - Template Section
Template.editor.helpers({
  code: function() {
    var plan = getPlan(Session.get("selectedPlan"));
    var code = 'var arDrone = require("ar-drone");\nvar client = arDrone.createClient();\n\nclient.takeoff()';

    if(plan) {
      code = code + ";\n\nclient";
      plan.path.forEach(function(conn) {
        code = code + ".after(" + conn.distance + ", function() { this.clockwise(" + conn.angle + "); })\n";
      });
      console.log("code generated");
    }
    return code.substring(0, code.lastIndexOf("\n")) + ";";
  },
  pos: function() {
    var selectedPos = Session.get("selectedPos");
    var plan = getPlan(Session.get("selectedPlan"));
    var connInfo = "No connection selected...";
    if(selectedPos !== null && selectedPos >= 0) {
      var conn = plan.path[selectedPos];
      connInfo = "Connection: " + conn.idx + " Angle: " + conn.angle + " Distance: " + conn.distance;
    }
    return connInfo;
  }
});

Template.editor.events({
  'click circle': function(evt, tmpl) {
    var id = evt.currentTarget.id;
    if(id >= 0) {
      Session.set("selectedPos", id);
    }
  },
  'mouseout .map': function() {
    Session.set("currentPos", null);
  },
  'mousemove .map': function(evt, tmpl) {
    var point = coordsRelativeToElement(evt.currentTarget, evt);
    Session.set("currentPos", point);
  },
  'dblclick .map': function(evt, tmpl) {
    var plan = getPlan(Session.get("selectedPlan"));
    var point = coordsRelativeToElement(evt.currentTarget, evt);

    var lastConn = plan.path[plan.path.length - 1] || {idx: 0, to: StartPos};
    var newConn = new Connection(lastConn.idx, lastConn.to, new Position(point.x, point.y));

    var newPath = plan.path;
    newPath.push(newConn);

    Plans.update(plan._id, {$set: {path: newPath}});

    Session.set("selectedPos", newConn.idx);
  }
});

Template.editor.rendered = function () {
  var svg = this.find("svg");

  console.log("editor rendered");

  Deps.autorun(function() {
    var plan = getPlan(Session.get("selectedPlan"));
    var selectedPos = Session.get("selectedPos");
    var currentPos = Session.get("currentPos");

    //todo evaluate if really neccessary to delete all paths first
    d3.select(svg).select(".path").selectAll("path").remove();
    d3.select(svg).select(".connections").selectAll("circle").remove();

    var callout = d3.select(svg)
                    .select("circle.callout")
                    .transition()
                    .duration(250)
                    .ease("cubic-out");

    if(plan && plan.path.length > 0) {
      // Draw a circle for each connection
      var posIdx = -1;
      var updatePositions = function (group) {
        group.attr("id", function (pos) { return pos.hasOwnProperty("idx") ? pos.idx : -1; })
        .attr("cx", function (pos) { return pos.x; })
        .attr("cy", function (pos) { return pos.y; })
        .attr("r", 10)
        .attr("class", function (pos) {
          return _.isEqual(pos, StartPos) ? "start" : "pos";
        })
        .style('opacity', function (pos) {
          return 1;
        });
      };

      var planPoints = [];
      for(var i = 0; i < plan.path.length; i++) {
        var conn = plan.path[i];
        if(i === 0)
          planPoints.push(conn.from);
        planPoints.push(_.extend(conn.to, {idx: conn.idx}));
      }

      var connections = d3.select(svg)
                          .select(".connections")
                          .selectAll("circle")
                          .data(planPoints, function (conn) { return conn.idx; });

      updatePositions(connections.enter().append("circle"));
      updatePositions(connections.transition().duration(250).ease("cubic-out"));
      connections.exit().transition().duration(250).attr("r", 0).remove();

      //Draw a path
      var updatePath = function(group) {
        var line = d3.svg.line()
          .x(function(d) { return d.x; })
          .y(function(d) { return d.y; })
          .interpolate("linear");

        group.attr("d", function(d) { return line(d); });
      };

      var planPath = [];
      var currentEndPos;
      plan.path.forEach(function (conn) {
        var pathPoints = [conn.from, conn.to];
        currentEndPos = _.extend(conn.to, {idx: conn.idx});
        planPath.push(pathPoints);
      });

      //selection based last tmp connection
      if(currentPos) {
        planPath.push([currentEndPos, currentPos]);
      }

      var path = d3.select(svg)
                   .select(".path")
                   .selectAll("path")
                   .data(planPath);

      updatePath(path.enter().append("svg:path"));
      path.exit();

      // Draw a dashed circle around the currently selected pos, if any, or at the end pos
      var calloutX, calloutY;
      if(plan.path[selectedPos]) {
        calloutX = plan.path[selectedPos].to.x;
        calloutY = plan.path[selectedPos].to.y;
      } else {
        calloutX = currentEndPos.x;
        calloutY = currentEndPos.y;
        Session.set("selectedPos", currentEndPos.idx);
      }

      callout.attr("cx", calloutX)
      .attr("cy", calloutY)
      .attr("r", 20)
      .attr("class", "callout")
      .attr("display", '');
    }
    else
      callout.attr("display", 'none');
  });

  $('pre code').each(function(i, e) {
    hljs.highlightBlock(e);
  });
};