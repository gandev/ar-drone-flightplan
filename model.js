Plans = new Meteor.Collection("plans");

Plans.allow({
	update: function() {
		return true;
	},
	remove: function() {
		return true;
	},
	insert: function() {
		return true;
	}
});

function getPlan(id) {
	return Plans.findOne({_id: id});
}

//todo reactive datasource Position, Connection
function Position(x, y) {
  this.x = x;
  this.y = y;
}

function Connection(lastIdx, from, to) {
	this.idx = lastIdx + 1;
    this.from = from; //Position
    this.to = to; //Position

    var xOffset = from.x - to.x;
    var yOffset = from.y - to.y;

    this.distance = Math.sqrt(Math.pow(xOffset, 2) + Math.pow(yOffset, 2)).toFixed(3);
    this.angle = Math.atan(yOffset/xOffset).toFixed(5);
}