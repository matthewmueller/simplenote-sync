/**
 * Module Dependencies
 */

var simplenote = require('simplenote'),
    Batch = require('batch');

/**
 * Expose `Sync`
 */

module.exports = Sync;

/**
 * Initialize `Sync`
 *
 * Required params are:
 *
 *   email: simplenote email
 *   password: simplenote password
 *   model: local model to save to
 *   tag: tag you want to sync with
 *
 * @param {Object} params
 * @return {Sync}
 */

function Sync(params) {
  if(!(this instanceof Sync)) return new Sync(params);
  this.client = simplenote(params.email, params.password);
  this.model = params.model;
  this.tag = params.tag;
}

/**
 * Sync
 *
 * @param {Function} fn
 * @return {Sync}
 */

Sync.prototype.sync = function(fn) {
  var self = this,
      batch = new Batch,
      Note = this.client,
      tag = this.tag,
      model = this.model;

  model.all(function(err, arr) {
    if(err) return fn(err);
    var keys = arr.map(function(obj) { return obj.key(); });

    arr.forEach(function(obj) {
      batch.push(function(done) { self.update(obj, done); });
    });

    Note.all(function(err, notes) {
      if(err) return fn(err);
      notes = notes
        .select(function(note) { return ~note.tags.indexOf(tag); })
        .reject(function(note) { return note.deleted; })
        .reject(function(note) { return ~keys.indexOf(note.key); })
        .forEach(function(note) {
          var obj = new model({ key : note.key, version : note.version });
          batch.push(function(done) { self.update(obj, done); });
        });

      batch.end(fn);
    });
  });
}

/**
 * Update
 *
 * @param {Object} obj
 * @param {Function} done
 */

Sync.prototype.update = function(obj, done) {
  var model = this.model,
      Note = this.client;

  Note.get(obj.key(), function(err, note) {
    if(err) return done(err);
    else if(note.version < obj.version()) return done();
    else if(note.deleted) return obj.remove(done);
    obj.set(note);
    obj.save(done);
  });
}
