# Notifications / Concurrency concerns

Any caching strategy introduces the problem of _consistency_ with concurrent clients.
For conventional web applications where entire pages are served this is not as 
noticeable of a problem. For clients which maintain long-term state (eg "single page applications")
this problem becomes a major point of failure.

Notification of state changes to the application is essential to maintaining integrity
for such clients. Failed commands and inconsistent data will result if clients are
consuming stale data. This is precisely why back end teams lazily disregard http caching
instead of [leveraging it](https://developers.google.com/speed/docs/insights/LeverageBrowserCaching).
It is ['easier' but not 'simpler'](http://www.infoq.com/presentations/Simple-Made-Easy). 

## Sledgehammers and scalpels

A state notification's level of context directly determines what kind of
tool a client can use to present consistent data. The less the context provided,
the heavier the tool required by the client.

#### Sledgehammer

Imagine a client which has 300 RedJack `asset` resources presented in an ordered list.
The view ordering is determined by its `name` attribute, alphabetically.

The client receives a notification somehow (discussed later) like this:

```js
var Notification = {
    event: 'organizationChanged'
    ,organization: 'RedJack'
}

```

The client knows something happened but has no idea which resources need to be updated to reflect the 'truth'.
The only option the client has is to force the user to refresh the page or component with _all_ resources with
request header:

    Cache-Control: no-cache

Each _client_ is now forced to maintain a caching strategy to make up for the api laziness.
What is worse is that now the knowledge about resource lifetimes has now inadvertently been 
transferred to the client(s). Remember [HATEOAS](https://en.wikipedia.org/wiki/HATEOAS)? 
It just got compromised.

#### Scalpel

Now imagine the client receiving a notification like this:

```js
var Notification = {
    event: 'assetRenamed'
    ,organization: 'RedJack'
    ,revision: '42'
    ,assetId: '/api/assets/123'
    ,userId: '2300'
}

```

The client has now been given _context_ information that can help it decide whether it
needs to do anything. 
Does the client have a reference to the `assetId`? If so, then it can traverse down to that resource and update itself; otherwise, do nothing.
Is that notification due to an command  **I** just issued? Do nothing since state was updated internally.

The point is that the more context we receive the more granular our updates can be and the more responsive our apps can appear.


## Rainbows and butterflies

_Context_ doesn't guarantee a happy story for consistency or compliance to HATEOAS.
Sometimes a client must still possess _limited_ foreknowledge about what resources should be
re-traversed to update their state. 
But this is where having a solid caching strategy for each resource really pays off since the server can decide whether resources are truly stale or not.

# Unpainted Corners

The main reason the **sledgehammer** is settled on is usually because the server team is 
not able (or willing) to dedicate the time to crafting:

* A cache strategy for each resource
* An evented domain or transaction script interface for its top-level resource handlers


