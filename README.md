consistency
===========

* [Caching](caching.md)
* [Notifications](notifications.md)

### Prerequisites

* Vagrant
* Ansible

###  Running

`vagrant up` => visit at `http://localhost:8000`

### API

The API uses the `HAL` Specification, but without the advanced features (eg _curie_ or _embedded_).


#### Immutable

```
/* Object Reference */

var Organization = {
    _links: {
        self: <Link>
        ,revisions: [<Link>]
    }
    ,name: <String>
    ,revision: <Number>
}

var Revisions = {
    _links: {
        self: <Link>
    }
    ,revisions: [<Number>]
}

var Asset = {
    _links: {
        self: <Link>
        ,banners: [<Link>]
    }
    , lastSeen: <String>
}

var AssetTuple = {
    name: <String>
    ,description: <String>
}

var AssetsCatalog = {
    _links: {
        self: <Link>
    }
    ,catalog: {
        <Uri>: <AssetTuple>
        ,<Uri>: <AssetTuple>
        //...
    }
}

```
