// XXX: Use _.str.capitalize instead of shoving this into the global namespace
capitalizeString = function(str) { return str.charAt(0).toUpperCase() + str.slice(1);}

Meteor.RemoteCollectionDriverWithCallbacks = function (name) {
  var self = this;
  self.name = name;
  self.mongo = Meteor.RemoteCollectionDriverWithCallbacks.connection;
  self.actions = Meteor.RemoteCollectionDriverWithCallbacks.actions;
  self.timings = Meteor.RemoteCollectionDriverWithCallbacks.timings;
  self.callbacks = {};
  _.each(self.actions, function(action) {
    _.each(self.timings, function(timing) {
      callbackName = timing + capitalizeString(action)
      self.callbacks[callbackName] = []});
  });
};

Meteor.RemoteCollectionDriverWithCallbacks.actions = ['find', 'findOne', 'insert', 'update', 'remove'];
Meteor.RemoteCollectionDriverWithCallbacks.timings = ['before', 'after'];

Meteor.RemoteCollectionDriverWithCallbacks.connection = new Meteor._Mongo(process.env.MONGO_URL);

_.each(Meteor.RemoteCollectionDriverWithCallbacks.actions, function(action) {
  Meteor.RemoteCollectionDriverWithCallbacks.prototype[action] = function() {
    // Turn arguments into an array so we can unshift this.name onto it
    // before sending it to this.mongo.insert (or find or findOne or whatever)
    var args = Array.prototype.slice.call(arguments);
    var befores = this.callbacks["before" + capitalizeString(action)]

    _.each(befores, function(before) {
      before.apply(this, args)
    })

    var argsForMongo = [this.name].concat(args)
    res =  this.mongo[action].apply(this.mongo, argsForMongo)

    var afters = this.callbacks["after" + capitalizeString(action)]

    _.each(afters, function(after) {
      after.apply(this, args)
    })
    return res
  }

  _.each(Meteor.RemoteCollectionDriverWithCallbacks.timings, function(timing) {
    var callbackName = timing + capitalizeString(action)
    Meteor.RemoteCollectionDriverWithCallbacks.prototype[callbackName] = function(fn) {
      this.callbacks[callbackName].push(fn)
    }

    // Add the callback adder to Meteor.Collection, as _collection is 
    // private.
    Meteor.Collection.prototype[callbackName] = function(fn) {
      this._collection[callbackName](fn);
    }
  })
})

// The contract is that driver.open returns an instance of something that 
// drives mongo, which is used as _collection.
Meteor.RemoteCollectionDriverWithCallbacks.open = function(name) {
  var res = new Meteor.RemoteCollectionDriverWithCallbacks(name);
  return res;
}
