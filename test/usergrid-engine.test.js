var assert = require('assert')
  , nock = require('nock')
  , extend = require('lodash.assign')
  , createSave = require('../')
  , fixtures = require('./fixtures')
  , save

describe('#init', function () {
  it('should setup correctly', function () {
    save = createSave('test',
      { host: 'https://localhost'
      , org: 'org'
      , app: 'app'
      , grantType: 'client_credentials'
      , clientId: 'client'
      , clientSecret: 'such secret, much wow'
      })

    assert.equal(save.idProperty, 'uuid')
  })

  it('should handle auth errors', function (done) {
    nock('https://localhost')
      .post('/org/app/token')
      .replyWithError('test')

    save.create(fixtures[0], function (error) {
      assert.equal(error.message, 'test')

      done()
    })
  })

  it('should handle non 200 auth response', function (done) {
    nock('https://localhost')
      .post('/org/app/token')
      .reply(500)

    save.create(fixtures[0], function (error) {
      assert.equal(error.message, 'Authorisation failure, responded with 500')

      done()
    })
  })

  it('should handle non json auth response', function (done) {
    nock('https://localhost')
      .post('/org/app/token')
      .reply(200, '{asd')

    save.create(fixtures[0], function (error) {
      assert.equal(error.message, 'Unexpected token a')

      done()
    })
  })
})

describe('#create', function () {
  it('should create a new entity', function (done) {
    nock('https://localhost')
      .post('/org/app/token')
      .reply(200, { 'access_token': 12345678 })

    nock('https://localhost')
      .post('/org/app/test')
      .reply(200, { entities: [ extend({ uuid: '12345678' }, fixtures[0]) ] })

    save.create(fixtures[0], function (error, object) {
      if (error) return done(error)

      assert.equal(object.uuid, '12345678')

      done()
    })
  })

  it('should handle request error', function (done) {
    nock('https://localhost')
      .post('/org/app/test')
      .replyWithError('test')

    save.create(fixtures[0], function (error) {
      assert.equal(error.message, 'test')

      done()
    })
  })

  it('should handle non 200 responses', function (done) {
    nock('https://localhost')
      .post('/org/app/test')
      .reply(500)

    save.create(fixtures[0], function (error) {
      assert.equal(error.message, 'Failed to create')

      done()
    })
  })
})

describe('#read', function () {
  it('should find an object', function (done) {
    nock('https://localhost')
      .get('/org/app/test/12345678')
      .reply(200, { entities: [ extend({ uuid: '12345678' }, fixtures[0]) ] })

    save.read('12345678', function (error, object) {
      if (error) return done(error)

      assert.equal(object.uuid, '12345678')

      done()
    })
  })

  it('should handle request error', function (done) {
    nock('https://localhost')
      .get('/org/app/test/12345678')
      .replyWithError('test')

    save.read('12345678', function (error) {
      assert.equal(error.message, 'test')

      done()
    })
  })

  it('should handle non 200 responses', function (done) {
    nock('https://localhost')
      .get('/org/app/test/12345678')
      .reply(500)

    save.read('12345678', function (error) {
      assert.equal(error.message, 'Failed to retrieve 12345678')

      done()
    })
  })
})

describe('#update', function () {
  it('should update an object', function (done) {
    var object = extend({ uuid: 1 }, fixtures[0])

    nock('https://localhost')
      .put('/org/app/test/1')
      .reply(200, { entities: [ object ] })

    save.update(object, function (error, updatedObject) {
      if (error) return done(error)

      assert.equal(updatedObject.foo, 'bar')

      done()
    })
  })

  it('should return an error with overwrite', function (done) {
    save.update({}, 'test', function (error) {
      assert.equal(error.message, 'Overwrite not supported')

      done()
    })
  })

  it('should not allow updating without an id', function (done) {
    save.update({}, function (error) {
      assert.equal(error.message, 'Object has no \'uuid\' property')

      done()
    })
  })

  it('should handle errors', function (done) {
    var object = extend({ uuid: 1 }, fixtures[0])

    nock('https://localhost')
      .put('/org/app/test/1')
      .replyWithError('test')

    save.update(object, function (error) {
      assert.equal(error.message, 'test')

      done()
    })
  })

  it('should handle non 200 responses', function (done) {
    var object = extend({ uuid: 1 }, fixtures[0])

    nock('https://localhost')
      .put('/org/app/test/1')
      .reply(500)

    save.update(object, function (error) {
      assert.equal(error.message, 'Failed to update 1')

      done()
    })
  })
})

describe('#updateMany', function () {
  it('should return an error', function (done) {
    save.updateMany(fixtures[0], function (error) {
      assert.equal(error.message, 'updateMany unsupported')

      done()
    })
  })
})

describe('#deleteMany', function () {
  it('should return an error', function (done) {
    save.deleteMany(fixtures[0], function (error) {
      assert.equal(error.message, 'deleteMany unsupported')

      done()
    })
  })
})

describe('#count', function () {
  it('should return the number of objects in a collection', function (done) {
    nock('https://localhost')
      .get('/org/app')
      .reply(200,
        { entities:
          [ { metadata:
              { collections:
                { test:
                  { count: 2 }
                }
              }
            }
          ]
        })

    save.count({}, function (error, count) {
      if (error) return done(error)

      assert.equal(count, 2)

      done()
    })
  })

  it('should handle errors', function (done) {
    nock('https://localhost')
      .get('/org/app')
      .replyWithError('test')

    save.count({}, function (error) {
      assert.equal(error.message, 'test')

      done()
    })
  })

  it('should handle non 200 responses', function (done) {
    nock('https://localhost')
      .get('/org/app')
      .reply(500)

    save.count({}, function (error) {
      assert.equal(error.message, 'Count failed')

      done()
    })
  })
})

describe('#find', function () {
  it('should find objects', function (done) {
    nock('https://localhost')
      .get('/org/app/test?ql=SELECT%20*%20WHERE%20foo%20%3D%20bar')
      .reply(200, { entities: fixtures })

    save.find('SELECT * WHERE foo = bar', function (error, objects) {
      if (error) return done(error)

      assert.equal(objects.length, 2)

      objects.forEach(function (object) {
        assert.equal(object.foo, 'bar')
      })

      done()
    })
  })

  it('should allow limits', function (done) {
    nock('https://localhost')
      .get('/org/app/test?ql=SELECT%20*%20WHERE%20foo%20%3D%20bar&limit=1')
      .reply(200, { entities: [ fixtures[0] ] })

    save.find({ ql: 'SELECT * WHERE foo = bar', limit: 1 }, function (error, objects) {
      if (error) return done(error)

      assert.equal(objects.length, 1)

      assert.equal(objects[0].foo, 'bar')

      done()
    })
  })
})

describe('#findOne', function () {
  it('should find objects', function (done) {
    nock('https://localhost')
      .get('/org/app/test?ql=SELECT%20*%20WHERE%20foo%20%3D%20bar&limit=1')
      .reply(200, { entities: [ fixtures[0] ] })

    save.findOne('SELECT * WHERE foo = bar', function (error, object) {
      if (error) return done(error)

      assert(!Array.isArray(object))

      assert.equal(object.foo, 'bar')

      done()
    })
  })
})

describe('#createOrUpdate', function () {
  it('should create a new object', function (done) {
    nock('https://localhost')
      .post('/org/app/test')
      .reply(200, { entities: [ extend({ uuid: 3 }, fixtures[1]) ] })

    save.createOrUpdate(fixtures[1], function (error, object) {
      if (error) return done(error)

      assert.equal(object.uuid, 3)

      done()
    })
  })

  it('should update an object', function (done) {
    var object = extend({ uuid: 3 }, fixtures[0])

    nock('https://localhost')
      .get('/org/app/test/3')
      .reply(200, { entities: [ object ] })

    nock('https://localhost')
      .put('/org/app/test/3')
      .reply(200, { entities: [ extend({}, object) ] })

    save.createOrUpdate(object, function (error, updatedObject) {
      if (error) return done(error)

      assert.equal(updatedObject.foo, 'bar')

      done()
    })
  })
})

describe('#delete', function () {
  it('should delete an object', function (done) {
    nock('https://localhost')
      .delete('/org/app/test/2')
      .reply(200, { entities: [ fixtures[0] ] })

    save.delete(2, function (error, object) {
      if (error) return done(error)

      assert.deepEqual(object, fixtures[0])

      done()
    })
  })

  it('should handle errors', function (done) {
    nock('https://localhost')
      .delete('/org/app/test/1')
      .replyWithError('test')

    save.delete(1, function (error) {
      assert.equal(error.message, 'test')

      done()
    })
  })

  it('should handle non 200 responses', function (done) {
    nock('https://localhost')
      .delete('/org/app/test/1')
      .reply(500)

    save.delete(1, function (error) {
      assert.equal(error.message, 'Failed to delete 1')

      done()
    })
  })
})
