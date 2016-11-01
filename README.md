# save-usergrid

[![Build Status](https://travis-ci.org/confuser/save-usergrid.png?branch=master)](https://travis-ci.org/confuser/save-usergrid)

[Usergrid](https://usergrid.apache.org) persistance engine for [save](https://npmjs.org/package/save)

## Installation
```
npm install save-usergrid
```

## Usage

```js
var save = require('save') // npm install save
  , usergrid = require('save-usergrid')
  , collection = 'contacts'
  , auth =
    { host: 'https://localhost'
    , org: 'org'
    , app: 'app'
    , grantType: 'client_credentials'
    , clientId: 'client'
    , clientSecret: 'such secret, much wow'
    }

// Create a save instance and pass in a Usergrid engine.
var contactStore = save('Contact', { engine: usergrid(collection, auth) })

// Then we can create a new entity.
contactStore.create({ name: 'James', email: 'jamesmortemore@gmail.com'}, function (error, contact) {

  // The created 'contact' is returned and has been given a uuid
  console.log(contact)
})

// Lets find that entity with a query
contactStore.findOne('SELECT * WHERE name = James', function (error, contact) {
  // Will be the entity created above
  console.log(contact)
})

// Lets update the entity
contactStore.read('1234-1234-1234-1235', function (error, contact) {
  contact.name = 'Jamez'

  contactStore.update(contact, function (error, updatedContact) {
    console.log(updatedContact)
  })
})

// Lets delete the entity
contactStore.delete('1234-1234-1234-1235', function (error, contact) {
  // Entire entity that was deleted
  console.log(contact)
})
```
