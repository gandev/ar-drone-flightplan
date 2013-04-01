Meteor.publish("plans", function() {
  //publish modified plans
  //--> each location as instance of Position (reactive datasource)

  return Plans.find({});
});

Meteor.startup(function() {
  Plans.remove({});

  //sample data
  var conn0 = new Connection(-1, new Position(0, 0), new Position(50, 100));
  var conn1 = new Connection(conn0.idx, conn0.to, new Position(100, 100));
  var conn2 = new Connection(conn1.idx, conn1.to, new Position(200, 200));
  var conn3 = new Connection(conn2.idx, conn2.to, new Position(300, 200));

  Plans.insert({
    name: 'Plan A',
    path: [conn0, conn1, conn2, conn3]
  });

  Plans.insert({
    name: 'Plan B',
    path: []
  });
});