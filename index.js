function jiffyMultiServer(frameworkServer, httpServer, options = null) {
	this.frameworkServer = frameworkServer;
	this.httpServer = httpServer;
	// options.http = 'fastify' | 'express'
	this.options = options;
	//format object = protocol + path : {'path' : string, 'options': Object, 'f': function}
	this.listServicesWS = {};
	//initializing server
	this.io = require('socket.io')(httpServer);
	//same structure as options, you can pass an options object plus a callabck or only the callback
	this.get = function (path, ...args) {
		this.frameworkServer.get(path, args[0]);
		var options = {};
		var f = args[0];
		if(args.length > 1) { 
			options =  args[1]; 
		}
		if(options.ioDisable != true) {
			var paramsPath = [];
			if(path.indexOf(':') !== -1) {
				var resultPathParse = this.parsePathForWS(path);
				path = resultPathParse.pathRegex;
				paramsPath = resultPathParse.params;
			}
		this.listServicesWS['get' + path] = {'path': path, 'options': options, 'f': f, 'params': paramsPath};
		}
	}
	this.post = function (path, ...args) {
		this.frameworkServer.post(path, args[0]);
		var options = {};
		var f = args[0];
		if(args.length > 1) { 
			options =  args[1]; 
		}
		if(options.ioDisable != true) {
			var paramsPath = [];
			if(path.indexOf(':') !== -1) {
				var resultPathParse = this.parsePathForWS(path);
				path = resultPathParse.pathRegex;
				paramsPath = resultPathParse.params;
			}
			this.listServicesWS['post' + path] = {'path': path, 'options': options, 'f': f, 'params': paramsPath};
		}
	}	
	this.listen  = function (port, ...args) {
		var cb = args[0];
		if(args.length > 1) {
			cb = args[1];
		}
		if(this.options.http == 'fastify') {
		this.frameworkServer.listen(port, ...args);			
		}else {
		this.httpServer.listen(port, ...args);	
		}
			this.io.on('connection', (socket) => {
					socket.on("req", (o) => {
						var requestParam = o.reqPathServer.path;
						var timestamp = o.reqPathServer.timestamp;
						//client can send the path to execute in 2 different parameters name, just in case the client is sending that param name in the request
						//timestamp is sent back so client can diferentiate the callback to be used when the answer arrives, in case that the endpoint is called twice 
						if(o.reqPathServer99 != null && o.reqPathServer99 != undefined && o.reqPathServer99 != '') {
							requestParam = o.reqPathServer99.path;							
							timestamp = o.reqPathServer99.timestamp;
						}
						var responseObj = {params: {}};
						//parsing path & parameters
						var keyService = '';
						Object.keys(this.listServicesWS).forEach(k => {
							if(requestParam.match(k) != null){
								keyService = k;
							}
						});
						if(keyService === '') {
							socket.emit('res', {code: 404});
						} else {
							if(this.listServicesWS[keyService].params.length > 0) {
							var arrayValuesParams = new RegExp(this.listServicesWS[keyService].path, 'ig').exec(requestParam).splice(1,this.listServicesWS[keyService].params.length);
								for(var i=0; i < arrayValuesParams.length; i++){
									responseObj.params[this.listServicesWS[keyService].params[i]] = arrayValuesParams[i];							
								}
							} else {
								responseObj.params = null;
							}
							responseObj.originalUrl = requestParam.replace(/(get\/|post\/)/i, "");
							responseObj.method = requestParam.split("/")[0].toUpperCase();						
							switch(responseObj.method) {
								case 'POST':
									responseObj.body = o;
								break;
								case 'GET':
									responseObj.query = o;								
								break;
							}
							// we create a new object instance, with the socket as member variable and the replication of the response function for compatibility
							// in this way, when the refer to "this" in the response function, we get the socket of this request
							var resObj = Object.assign({}, {"socket": socket, method: requestParam.split("/")[0], "send": this.response, "json": this.response, "timestamp": timestamp, "path": requestParam, type: this.setType, header: this.setHeaderDummy, headers: this.setHeaderDummy});
							this.listServicesWS[keyService].f(responseObj, resObj);
						}
					});				
			});				
	}
	this.parsePathForWS = function(path) {
		var r = {pathRegex: '', params: []};
		r.params = path.match(new RegExp("\:[a-zA-Z0-9\-\_\.]+", 'ig'));
		for(var u = 0; u < r.params.length; u++) {
			r.params[u] = r.params[u].replace(/\:/ig, '');
		}
		r.pathRegex = path.replace(/\:[a-zA-Z0-9\-\_\.]+/ig, '([a-zA-Z0-9\-\_\.]+)').replace("/", "\/");
		return r;
	}
	this.response = function (data, type = null){
		this.socket.compress(false);
		this.socket.emit("res", {"path": this.path, "method": this.method, "timestamp": this.timestamp, "data": data, "type": (type || this.typeVal)});
	}
	this.header = function () {
		return this;
	}
	this.headers = function () {
		return this;
	}
	this.setType = function (type) {
		this.typeVal = type;
		return this;
	}
}

module.exports = jiffyMultiServer
