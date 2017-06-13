var request = require('request')
  , es = require('event-stream')
  , extend = require('lodash.assign')
  , authenticator = require('./lib/authenticator')

module.exports = function (collection, engineOptions) {
  var self = es.map(createOrUpdate)
    , options = extend({}, { idProperty: 'uuid', timeout: 5000 }, engineOptions)

  options.appUrl = options.host + '/' + options.org + '/' + options.app
  options.url = options.host + '/' + options.org + '/' + options.app + '/' + collection

  var auth = authenticator(options)

  function create(object, callback) {
    self.emit('create', object)

    auth(function (error, token) {
      if (error) return callback(error)

      var opts =
      { timeout: options.timeout
      , json: true
      , headers: { Authorization: 'Bearer ' + token }
      , url: options.url
      , method: 'POST'
      , body: extend({}, object)
      }

      request(opts, function (error, res) {
        if (error) return callback(error)
        if (res.statusCode !== 200) return callback(new Error('Failed to create'))

        self.emit('afterCreate', res.body.entities[0])
        self.emit('received', res.body.entities[0])

        callback(error, res.body.entities[0])
      })
    })
  }

  function createOrUpdate(object, callback) {
    if (typeof object[options.idProperty] === 'undefined') {
      // Create a new object
      self.create(object, callback)
    } else {
      // Try and find the object first to update
      self.read(object[options.idProperty], function (error, entity) {
        if (error) return callback(error)

        if (entity) {
          // We found the object so update
          self.update(object, callback)
        } else {
          // We didn't find the object so create
          self.create(object, callback)
        }
      })
    }
  }

  function read(id, callback) {
    self.emit('read', id)

    auth(function (error, token) {
      if (error) return callback(error)

      var opts =
      { timeout: options.timeout
      , json: true
      , headers: { Authorization: 'Bearer ' + token }
      , url: options.url + '/' + id
      , method: 'GET'
      }

      request(opts, function (error, res) {
        if (error) return callback(error)
        if (res.statusCode === 404) return callback(null, null)
        if (res.statusCode !== 200) return callback(new Error('Failed to retrieve ' + id))

        self.emit('received', res.body.entities[0])

        callback(null, res.body.entities[0])
      })
    })
  }

  // Warning: Usergrid will create the entity if it does not exist, prevent this yourself!
  function update(object, overwrite, callback) {
    if (typeof overwrite === 'function') {
      callback = overwrite
      overwrite = false
    } else {
      return callback(new Error('Overwrite not supported'))
    }

    self.emit('update', object, overwrite)

    var updateObject = extend({}, object)
      , id = object[options.idProperty]

    if (!id) return callback(new Error('Object has no \'' + options.idProperty + '\' property'))

    auth(function (error, token) {
      if (error) return callback(error)

      var opts =
      { timeout: options.timeout
      , json: true
      , headers: { Authorization: 'Bearer ' + token }
      , url: options.url + '/' + id
      , method: 'PUT'
      , body: updateObject
      }

      request(opts, function (error, res) {
        if (error) return callback(error)
        if (res.statusCode !== 200) return callback(new Error('Failed to update ' + id))

        self.emit('afterUpdate', res.body.entities[0])
        self.emit('received', res.body.entities[0])

        callback(null, res.body.entities[0])
      })
    })
  }

  function updateMany(query, callback) {
    callback(new Error('updateMany unsupported'))
  }

  function deleteMany(query, callback) {
    callback(new Error('deleteMany unsupported'))
  }

   /**
   * Deletes one object. Returns an error if the object can not be found
   * or if the ID property is not present.
   *
   * @param {Object} object to delete
   * @param {Function} callback
   * @api public
   */
  function del(id, callback) {
    self.emit('delete', id)

    auth(function (error, token) {
      if (error) return callback(error)

      var opts =
      { timeout: options.timeout
      , json: true
      , headers: { Authorization: 'Bearer ' + token }
      , url: options.url + '/' + id
      , method: 'DELETE'
      }

      request(opts, function (error, res) {
        if (error) return callback(error)
        if (res.statusCode !== 200) return callback(new Error('Failed to delete ' + id))

        self.emit('afterDelete', id, res.body.entities[0])

        callback(null, res.body.entities[0])
      })
    })
  }

  function find(query, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    if (opts === undefined) {
      opts = {}
    }

    // // TODO Add streaming
    self.emit('find', query, options)

    auth(function (error, token) {
      if (error) return callback(error)

      var opts =
      { timeout: options.timeout
      , json: true
      , headers: { Authorization: 'Bearer ' + token }
      , url: options.url + '?ql='
      , method: 'GET'
      }

      // Handle string and String types
      if (Object.prototype.toString.call(query) === '[object String]') {
        opts.url += encodeURIComponent(query)
      } else {
        opts.url += encodeURIComponent(query.ql)

        if (query.limit) opts.url += '&limit=' + query.limit
        if (query.cursor) opts.url += '&cursor=' + query.cursor
      }

      request(opts, function (error, res) {
        if (error) return callback(error)
        if (res.statusCode !== 200) return callback(new Error('Query failed ' + opts.url))

        self.emit('received', res.body.entities)

        callback(null, res.body.entities, res.body)
      })
    })
  }

  function findOne(query, opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }

    self.emit('findOne', query)

    var usergridQuery = { ql: query.ql, limit: 1 }

    // Handle string and String types
    if (Object.prototype.toString.call(query) === '[object String]') {
      usergridQuery.ql = query
    }

    self.find(usergridQuery, function (error, entities) {
      if (error) return callback(error)

      self.emit('received', entities[0])

      callback(error, entities[0])
    })
  }

  // Usergrid does not currently support query counts, this returns approx collection count
  function count(query, callback) {
    self.emit('count')

    auth(function (error, token) {
      if (error) return callback(error)

      var opts =
      { timeout: options.timeout
      , json: true
      , headers: { Authorization: 'Bearer ' + token }
      , url: options.appUrl
      , method: 'GET'
      }

      request(opts, function (error, res) {
        if (error) return callback(error)
        if (res.statusCode !== 200) return callback(new Error('Count failed'))

        var ugCount = res.body.entities[0].metadata.collections[collection].count

        self.emit('received', ugCount)

        callback(undefined, ugCount)
      })
    })
  }

  return extend(self
    , { create: create
      , createOrUpdate: createOrUpdate
      , read: read
      , update: update
      , updateMany: updateMany
      , deleteMany: deleteMany
      , delete: del
      , find: find
      , findOne: findOne
      , count: count
      , idProperty: options.idProperty
      })
}
