consistency
===========

The goals here are to demonstrate, as simply as possible, possible approached to 
dealing with client-side consistency.

The opposing forces at work between an api and long-running stateful clients present
challenging problems on both ends of the request.

* Caching needs to be a foundational concern in api resource design
* Resources are consumed in composed interfaces, not monolithic
* Not all state changes may be isolated to a single resource representation. Caches need to react accordingly.

These forces require a strategy for notifications as a means of communicating 
eventual consistency and avoid the perception of data integrity failure (UX).

## Scope

The discussion here deals with public caches. Private caches provide more flexibility, though perhaps with 
more work, than the concerns here.

## Architecture

### Goals

Minimize consumption of underlying web server and let our http cache serve up 304s.

### Challenges

Of course, [cache invalidation](http://martinfowler.com/bliki/TwoHardThings.html).

### Description

NGINX for SSL termination, http caching using memcached module.

## Cache invalidation

Invalidating resources is going to be more expensive as we introduce more ways to mutate
data. [see here](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)

The simplest solution for cache invalidation is : DON'T. 

If we work with immutable objects, we will support:

* Manual updates to cached objects (client friendly)
* Simpler config for http responses...nothing expires

The 'hard' parts of fathom is the size of data, but for those masses fathom is 
really just a reporting tool across immutable data.

The volatile api objects could be teased out of the immutable bits so that we can
never expire while limiting the expiry of mutable objects.

Since our users work within a coarse `organization` context, it is reasonable to 
revision our resources at the organization level. State changes impacting assets would
update the user's organization revision and the resulting hashes for revisioning could 
make use of this revision for notifying clients of freshness.

When a fresh dump of, say, CommonCrawl data has been loaded the entire http cache would be invalidated.
In semver terms, this revisioning scheme can be considered a minor revision for the organization.

### ETags (Entity Tags)

[ETags](http://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.19) can be used to inform the cache whether to
return a `304 Not Modified` or a new representation (having a body). The client requests a resource embedding its last etag (header) and the cache server
[validates](http://tools.ietf.org/html/rfc2616#section-13.3) this against the application server to see if the etag is still valid.

Note that using resources like a db or file system to calculate the etag will remove the usefulness of a cache to save on resource (eg database)
usage costs.

### Knowledge Ownership

The knowledge for which resources should be refreshed upon notification of an app state change can be held in two places: the server or the client(s).

### Server Knowledge

The server knows which resources _require_ refreshing upon state change. _It_ is in charge of maintaining these relationships among
entities and the use of `HATEOAS` enforces this ownership. This means that when a command has taken place that affects multiple resources
it needs to somehow ensure that relevant ETags for those resources will report those changes.
The implementation for this depends on a variety of factors like whether a rich domain model is in use, how entities communicate internally, etc.
Personally, I'd lift all this outside the entities themselves and have a single memcached setup exposing url/etag value maps, having them
updated through pub/sub.


### Client Knowledge

It may be tempting to force clients to retraverse the api to get their own fresh copies using a `Cache-Control: no-cache` on each resource along the way,
but this 'sledgehammer' approach and removes the usefulness of caching at all.   How can a client know which resource it can
resources it should consider long-lasting? This path effectively violates the server as being owner of application state.

### Caching option

1. `nginx` for page-level (static) caching, and `nginx-memcached` for object (api) caching


#### References

* [Caching Isnt Optimization](http://restpatterns.org/Articles/Caching_Matters)
* [nginx-memcached](http://nginx.org/en/docs/http/ngx_http_memcached_module.html)

What if a client hits the api with a stale revision? 



