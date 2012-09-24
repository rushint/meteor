String.prototype.capitalize = function() { return this.charAt(0).toUpperCase() + this.slice(1);}

Meteor.RemoteCollectionDriverWithCallbacks = function (name) {
  var self = this;
  self.name = name;
  self.mongo_url = process.env.MONGO_URL;
  self.mongo = new Meteor._Mongo(self.mongo_url);
  self.actions = Meteor.RemoteCollectionDriverWithCallbacks.actions;
  self.timings = Meteor.RemoteCollectionDriverWithCallbacks.timings;
  self.callbacks = {};
  _.each(self.actions, function(action) {
    _.each(self.timings, function(timing) {
      callbackName = timing + action.capitalize()
      self.callbacks[callbackName] = []});
  });
};

Meteor.RemoteCollectionDriverWithCallbacks.actions = ['find', 'findOne', 'insert', 'update', 'remove'];
Meteor.RemoteCollectionDriverWithCallbacks.timings = ['before', 'after'];

_.each(Meteor.RemoteCollectionDriverWithCallbacks.actions, function(action) {
  Meteor.RemoteCollectionDriverWithCallbacks.prototype[action] = function() {
    // Turn arguments into an array so we can unshift this.name onto it
    // before sending it to this.mongo.insert (or find or findOne or whatever)
    var args = arguments;
    var argsForMongo = Array.prototype.slice.call(arguments);
    argsForMongo.unshift(this.name)
    var befores = this.callbacks["before" + action.capitalize()]
    var afters = this.callbacks["after" + action.capitalize()]

    _.each(befores, function(before) {
      before.apply(this, args)
    })
    res =  this.mongo[action].apply(this.mongo, argsForMongo)
    _.each(afters, function(after) {
      after.apply(this, args)
    })
    return res
  }

  _.each(Meteor.RemoteCollectionDriverWithCallbacks.timings, function(timing) {
    var callbackName = timing + action.capitalize()
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
