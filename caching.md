# Caching overview

[Caching isn't an optimization step](http://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm#fig_5_4). 
It is a [constraint](http://wwatson.me/2011/10/13/rest-constraints-part-5/) for RESTful compliance.

There are two primary http caching types, expiration caching and validation caching. 

**Expiration caching** (eg `max-age`) off-loads burden to the _browser_. Therefore, it improves performance because there is no 
http roundtrip.

**Validation caching** (eg `etag`) off-loads burden to the http cache (eg 'nginx'). It _can_ improve performance if the server provides
a lightweight identity validation approach, but it _does_ require an http roundtrip. This can also save significant _bandwidth_ costs (no body) and
save resource consumption costs too (eg no database calls needed).

Each has varying _consistency_ implications that need to be reconciled with at least:

* cost : _validation_ caching drastically saves resource consumption
* simplicity : server-side burden increases with `ETag` stamping. Revisioning can increases this burden too.
* performance : _expiration_ caching and, to a lesser degree, _validation_ caching pushes burden outside the application so clients appear more responsive.
    * All performance problems are first due to http roundtrips, and secondly by server-side responsiveness.
* scalability : varying caching requirements can expose various contexts for resources which can helps us scale the app horizontally. 
    * Models are no longer monolithic, but instead composable.

Varying caching approaches are detailed below, considering their implementation and consistency implications:

## Immutable (One Year)

The most efficient and simplest type of caching is forever (http: one year).
This moves the burden of caching to the _client_ and is the _cheapest_ in both dev resources and hard bandwidth costs.

* Exactly one HTTP hit (download); assuming browser history/cache is not destroyed of course.
* Simple server implementation (setting a response header)

This is done by setting your expiration header on the resource response:

    Cache-Control: max-age=31536000

This tells the browser to cache the response for one year (in _seconds_).

> What about consistency?

#### Static Assets

Static assets like `.js`,`.css` files, we can simply revision the folder and drop the assets in there.
Subsequent updates to the `index.html` will reference the new revision of the assets.
The `index.html` is, of course, not `no-cache` in this scenario.

#### Dynamic Assets (eg api)

Dynamic assets can embed a logical revision number in their uri. 
This revision can be on a logical boundary, like a user's organization, and is updated on any state changes
to the dataset.
`_links` would reference these new revision urls from the api. 

A backend domain which is storing state instead of events may have difficulty with this since it is likely all endpoints have not
been cached in the http cache (or warming them up proactively is too expensive). In this case, an revision scheme can be delegated to 
for resolving urls to either the appropriate revision body, or `404`.
Event sourced persistence strategy helps support revisions which make forward-only modeling like this a snap. 
There is a side-effect here that can be very valuable...you now can move forward and backward through revisions of your application.
Even if this approach is not taken on the entire api, there are usually contexts within an application which group data (boundaries)
in such a way this could be very valuable.

## Revisioned / Validatable (Etags)

#### Dynamic Assets (eg api)

Instead of burdening clients with caching, this approach places burden for caching entity bodies onto an http cache (eg nginx).
This _can_ improve performance because it reduces server-side resource consumption but **IT STILL REQUIRES AN HTTP ROUNDTRIP**, which is
really the bottleneck in client applications.

The `max-age` expiration header is low enough so that clients must _revalidate_ their resources each time.

When a client requests a resource it received an `ETag` header in the response:

    ETag: "686897696a7c876b7e"


Subsequent requests by the client will include this request header:

    If-None-Match: "686897696a7c876b7e"

> What about consistency?

The proxy server will ask the application if the ETag represents the current revision, expecting either a `304 Not Modified` (thereby returning the 
body from its cache), or a `200 OK` to update the cache with the fresh resource as appropriate.

**CAUTION:** Care must be taken to determine how this ETag is stamped considering server clusters. 
Server identity must not be embedded in the construction of this revision value.


## Validation (Etags) + Immutable

#### Dynamic Assets (eg api)

Varying resource attribute volatilities can (_should_) demand a reworking of resource organization. 
Instead of conceiving of models monolithically, one can tease out the longer-lived data from the more dynamic and will likely
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

The client downloads an  `asset` resource _once_; subsequent requests will be served from browser cache.

The `assetsCatalog` resource will use an Etag to validate consistency. This means _bandwidth_, not latency, is improved here although the server
will hopefully have a lightweight mechanism for validating Etag and returning `304 Not Modified`.It now uses that to get bookkeeping type data
to appear responsive. If further detail is needed, the client can iterate over the catalog to cobble together the bits it may need from underlying 
`asset` resources, traversing each one in kind. This is _far_ better than requiring _n_ http calls before data can be shown.

Note too that the `name` attribute is found in the `AssetsCatalog`. 
Client `PATCH`es to rename the asset will now be sent to the `assets-catalog` endpoint.

Also note that the ordering strategies can be pulled out with a catalog like this.
This makes reordering resources according to different domain concepts a snap.

> What about really large catalog resources?

Often these catalogs can be partitioned logically according to some other domain concept, like a user's 
organization, regions, etc. If the download is still considerable, notified clients can download the catalog
in the background and update their views as needed. Clients which initiate the change can update their view inmemory while
waiting for the download to complete.
