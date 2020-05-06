# jiffyMultiServer
Mirror wrapper for server request on http &amp; websocket if is available

> If socket.io server had a bastard son with fastify or express, this will be the result - [David R. Comba Lareu](https://twitter.com/shadow_of__soul)

**THIS IS A PROOF OF CONCEPT. USE IT AT YOUR OWN RISK**

# What is jiffyMultiClient?
jiffyMultiServer is a wrapper (that works togheter with [jiffyMultiClient](https://github.com/ipsilondev/jiffyMultiClient), that mirrors server to http services in websocket flavor (if available), supporting the same syntax, properties and methods as fastify & express to make transparent, effortless request, automatically changing protocols if available.

# Why?
HTTP has a inherent overhead. Even if you have can improve server response times, is pretty hard that it will be faster than Websocket (from our benchmarking, the minimum latency on a HTTP request, is 30ms, vs 1-5ms of any websocket exchange). But at the same time, websocket is not instantly connected to the server either (WS takes at least, 200ms to establish a connection). What happen if you want to make a request as soon the page loads anyway and not wait for WS to connect? and have a transparent API that will not make your code hard to maintain? What happen if you want to just one day, stop using this and go back to simple fastify/express by only changing 3 lines of code? That's the reason behind creating jiffyMultiServer.

# Ok, i wanna give it a try, what now?

We recommend you checkout our [example repo](https://github.com/ipsilondev/jiffyExample) first.

## Installation

`npm install git+https://github.com/ipsilondev/jiffyMultiServer.git`

## Use with fastify

```javascript
const fastify = require('fastify')({
  //logger: true,
  maxParamLength: 300
});
const jiffyMultiServer = require('jiffymultiserver');
var server = new jiffyMultiServer(fastify, fastify.server, {http: 'fastify'});
```

## Use with express

```javascript
var express = require('express');
var server  = express();
var serverHTTP  = require('http').Server(server);

const jiffyMultiServer = require('jiffymultiserver');

var server = new jiffyMultiServer(server, serverHTTP, {http: 'express'});
```

## Defining routes
Defining routes, is exactly the same as with plain `fastify` or `express`
```javascript
server.post('/getJSON', (req, res) => {
	res.send({"obj": req.body.param1});
});

server.get('/getJSON', (req, res) => {
	res.send({"obj": req.query.param1});
});

server.post('/getJSON/:filename', (req, res) => {
	res.send({"obj": fs.readFileSync(req.params.filename)});
});

server.get('/jiffyClient.js', (req, res) => {
	res.type('text/html').send(fs.readFileSync('./node_modules/jiffymulticlient/index.js'));
}, {ioDisable: true});	
```
the object `req` & `res` plus functions as `send`, `json`, `type` are emulated if the request comes from the websocket route and returning the same objects as a normal HTTP request (partially, look at the end of the file for incomplete API). If you define `ioDisable` as a third argument, the route will not be available from websocket at all, so any WS request to that route, will be invalid. `Buffer` response are supported by server & client too. Parameters are supported too.

## Listening
After all the route are defined...

```javascript
server.listen(80, (err) => {
	console.log("listening in port 80")
	});
```

## I want to go back to simple fastify / express
The use of jiffiMultiServer is riskless. Simply, as it has exactly the same syntax as `fastify` & `express`, if you assign it to the server instance, it will automatically work, all the code, with no changes

## Quirks, bugs, uncomplete API

The work done so far, is not a 1:1 mirror implementation of fastify & express on websockets. There are tons of properties that are not implemented, functions too. Only basic functions & logic is implemented, to mirror `get` & `post` server request on both flavors. This is a proof of concept, and has only been developer as is. No guarantees to be extended in the future. 
Properties like `path`, `ip` etc.. will not be available if the request came from WS. **Plus, any middleware installed will not be executed.**

**Known problem with similar routes using params**
The routes are saved internally by the order the `get` or `post` function is executed. If you have a similar routes as:
`/files/:filename`
`/files/:filename/pages/:page`
The regexp will answer the first request, and not the second one, if it was inserted first. A workaround, would be to define the larger routes first (or send me a PR fixing this)

**Compression is disasbled in socket.io**
Compression has been disabled on socket.io due [this bug](https://github.com/socketio/socket.io/issues/3595)

**YOU WILL LOSE CACHE-CONTROL & ETAG SUPPORT ON WEBSOCKETS**
Enabling websockets, means that you are losing Cache-Control/ETag  capabilities. That means that if you are loading images or static content from this request's, they will be downloaded anyway, even if they are already cached by an earlier HTTP request.

# Author

Made with love, by [David R. Comba Lareu](https://twitter.com/shadow_of__soul) CEO of [Ipsilon Developments Inc.](https://ipsilondev.com), MIT licensed.
