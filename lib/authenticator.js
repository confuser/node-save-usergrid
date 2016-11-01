var request = require('request')
  , memoize = require('memoizee')

module.exports = function (authOpts) {
  var opts =
  { method: 'POST'
  , url: authOpts.appUrl + '/token'
  , timeout: authOpts.timeout
  , form:
    { 'grant_type': authOpts.grantType
    , 'client_id': authOpts.clientId
    , 'client_secret': authOpts.clientSecret
    }
  }

  function auth(callback) {
    request(opts, function (error, res) {
      if (error) return callback(error)

      if (res.statusCode !== 200) {
        return callback(new Error('Authorisation failure, responded with ' + res.statusCode))
      }

      var data

      try {
        data = JSON.parse(res.body)
      } catch (e) {
        return callback(e)
      }

      callback(null, data.access_token)
    })
  }

  return memoize(auth, { async: true, prefetch: true, maxAge: 3600 * 1000 })
}
