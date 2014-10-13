There are two http caching types, expiration caching and validation caching. 
Each has varying _consistency_ implications that need to be reconciled with cost and simplicity.

The stages of caching and consistency implications:

## Immutable (Sorta)

The most efficient and simplest type of caching is forever (http: one year).
This moves the burden of caching to the _client_ and is the _cheapest_ in both dev resources and hard bandwidth costs.

* Exactly one HTTP hit (download); assuming browser history/cache is not destroyed of course.
* Simple server implementation (setting a response header)

This is done by setting your expiration header on the resource response:

    Cache-Control: max-age=31536000

This tells the browser to cache the response for one year (in _seconds_).

> What about consistency?

### Static Assets

Static assets like `.js`,`.css` files, we can simply revision the folder and drop the assets in there.
Subsequent updates to the `index.html` will reference the new revision of the assets.
The `index.html` is, of course, not `no-cache` in this scenario.

### Dynamic Assets (eg api)

Dynamic assets can embed a logical revision number in their uri. 
This revision can be on a logical boundary, like a user's organization, and is updated on any state changes
to the dataset.
`_links` would reference these new revisions from the api.
A backend domain which is storing state instead of events may have difficulty with this since it is likely all endpoints have not
been cached in the http cache (or warming them up proactively is too expensive). 
Event sourced data easily supports revisions which make forward-only modeling like this a snap. 
Conventional persistence strategies (eg database) may make this too costly. Too bad.
There is a side-effect here that can be very valuable...you now can move forward and backward through revisions of your application.
Even if this approach is not taken on the entire api, there are usually contexts within an application which group data (boundaries)
in such a way this could be very valuable.


## Validation (Etags) + Immutable

### Dynamic Assets (eg api)

Immutable data can demand a reworking of resource organization. Instead of conceiving of models
as monolithic data buckets, one can tease out the immutable data from the more dynamic and will likely
find the behaviors that _make_ different parts more dynamic given clearer context as a result.

For example, consider this naïve model:

```js

var Asset = {
   _links: {
       self: <Link>
       batched_observations: <Link>
   }
   ,name: <String>
   ,id: <UUID>
   ,groups: <Array>
}

```

The `batched_observations` and `groups` data rarely changes (during a quarterly batch dump), so we'd like to mark our `asset` as immutable.
The problem is, we want the user to `rename` this asset through a form. We have effectively mixed concerns of an asset and the lifetime of the different datum is
revealing this failure. One approach to resolving this could be _cataloging_ our assets in our api:


```js

// max-age={one year}
var Asset = {
   _links: {
       self: <Link>
       ,batched_observations: <Link>
       ,catalog: <Link> //to assets-catalog
   }
   ,id: <UUID>
   ,groups: <Array>
}

//max-age={one minute}
var AssetsCatalog = {
    _links: {
        self: <Link>
        ,default_ordering: <Link>
    }
    catalog: {
        '/api/assets/123': {
            name: <String>
        }
        ,'/api/assets/234' {
            name: <String>
        }
        ,...
    }
}

//max-age={one minute}
var DefaultAssetsOrdering = {
    order: [
        '/api/assets/234'
        ,'/api/assets/123'
    ]
}

```

The client downloads the assets catalog _once_ and now uses that to get bookkeeping type data
to appear responsive. If further detail is needed, the client can iterate over the catalog to
cobble together the bits it may need from underlying `asset` resources.
This is _far_ better than requiring _n_ http calls before data can be shown.

Note too that the `name` attribute is found in the `AssetsCatalog`. 
This makes reordering resources according to different view or domain requirements a snap.

Client `PATCH`es to rename the asset will now be sent to the `assets-catalog` endpoint.

Also note that the ordering strategies can be pulled out with a catalog like this.

> What about really large catalog resources?

Often these catalogs can be partitioned logically according to some other domain concept, like a user's 
organization, regions, etc. If the download is still considerable, notified clients can download the catalog
in the background and update their views as needed. Clients which initiate the change can update their view inmemory while
waiting for the download to complete.
