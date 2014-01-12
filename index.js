var express = require("express"),
	fs = require("fs"),
	_ = require("underscore"),
	step = require("step"),
	path = require("path");

// Load config and assign it to global
var config = global.config = require("./config");

// Setup mysql pool
var pool = require("mysql").createPool({
	host: config.mysql.host,
	user: config.mysql.user,
	password: config.mysql.password,
	database: config.mysql.database
});
global.mysql = pool;
global.ROOT = __dirname;

// weibo client
var weibo2 = require("./weibo2/lib/weibo2.js");
var weibo2api = new weibo2["WeiboApi"]({
	app_key: config.weibo.key,
	app_secret: config.weibo.secret
});

var argv = require("optimist").argv;

// Make sure the listen port
if (argv["http_port"]) {
	var http_port = argv["http_port"];
}
else {
	var http_port = config["http_port"];
}

var oldlog = console.log;
console.log = function () {
	var data = JSON.stringify(arguments);
	data += "\r\n";
	fs.appendFileSync(ROOT + '/.log', data);
	oldlog.apply(this, arguments);
}

// Maybe add lock/free lock feature to prevent other user 
// change it before me not finished
function her_point_plusone(her_id) {
	_.each(hers, function (her, index) {
		if (her["id"] == her_id) {
			hers[index]["point"] += 1;
		}
	})
}

// Front handler
function frontRouter(req, res) {
	var sess = req.session;
	if (req.body && req.body["signed_request"]) {
		weibo2api.parseSignedRequest(req.body["signed_request"]);
		req.session.oauth_data = weibo2api.options;
		if (weibo2api.options["access_token"] == undefined) {
			res.cookie("auth", "false");
		}
		else {
			res.cookie("auth", "true");	
		}
	}
	else {
		res.cookie("auth", "false");
	}

	fs.readFile("./index.html", {encoding: "utf8"}, function (err, html) {
		res.writeHeader(200, {"Content-Type": "text/html"});  
        res.write(html); 
        res.end();
	});
}

function search_suggestion_from_baidu(keyword, cb) {
	var Buffer = require('buffer').Buffer;
	var Iconv = require("iconv").Iconv;
	cb || (cb = function () {});
	function parse_return(str) {
		var seggestions = str["s"];
		// search all her
		var match_hers = [];
		_.each(hers, function (her) {
			var name = her["name"];
			_.each(seggestions, function (s) {
				if (name.indexOf(s) !== -1) {
					match_hers.push(her);
				}
			});
		});
		cb(str, match_hers);
	}
	var params = {
		wd: keyword,
		cb: "parse_return",
		from: "superpage",
		t: new Date().getTime()
	};
	var url = "suggestion.baidu.com";
	var path = "/su";
	var http = require("http");
	var options = {
		hostname: url,
		path: "/su?" + require("querystring").stringify(params),
		method: "GET",
	};
	var req = http.request(options, function (res) {

		var buffers = [];
		var size = 0;
		res.on("data", function (chunk) {
			buffers.push(chunk);
			size += chunk.length;
		});

		res.on("end", function () {
			var buf = new Buffer(size);
			var pos = 0;
			for (var i = 0; i < buffers.length; i++) {
				buffers[i].copy(buf, pos);
				pos += buffers[i].length;
			}
			var iconv = new Iconv("gbk", "utf-8");
			var data = iconv.convert(buf);
			eval(data.toString()); 
		});
	});

	req.end();
}

// setup server
function init(hers, pages) {
	var app = express();
	app.use(express.bodyParser());
	app.use(express.cookieParser("voteher"));
	app.use(express.session({secret: "voteher", key: "voteher"}));
	app.use(express.static(__dirname + "/public"));

	app.get("/allher", function (req, res) {
		var q = req.query['q'];
		if (typeof(q) == "undefined") {
			res.json(hers);
		}
		else {
			search_suggestion_from_baidu(q, function (obj, match_hers) {
				res.json(match_hers);
			});
		}

	});

	app.post("/", frontRouter);
	app.get("/", frontRouter);

	// voteher
	app.post("/voteher", function (req, res) {
		if (req.session.oauth_data && req.session.oauth_data["access_token"]) {
			var weibo_id = req.session.oauth_data["user_id"];
			var time = Math.round(new Date().getTime() / 1000);
			var her_id = req.body["her_id"];
			var ip = req.headers['x-forwarded-for'] || 
     					req.connection.remoteAddress || 
     					req.socket.remoteAddress ||
     					req.connection.socket.remoteAddress;
     		if (!her_id && !_.isNumber(her_id)) {
     			return res.send({
     				success: false,
     				message: "Her id missed",
     				data: null
     			});
     		}

     		// After auth user from weibo, we plan to add new vote record
     		mysql.getConnection(function (err, connection) {
     			if (err) {
     				console.log(err);
     			}
     			else {
     				console.log('start to query database');
     				var params =  [her_id, time, ip, weibo_id];
     				console.log(params);
     				connection.query("INSERT INTO vote (her_id, time, ip, weibo_id) VALUES (?, ?, ?, ?)" ,params, function (err, result) {
     					if (err) {
     						console.log(err);
     					}
     					else {
     						// we also need to update record account
     						params = [
     							her_id
     						];
     						connection.query("UPDATE her set point = point + 1 WHERE her_id = ?", params, function (err, result) {
								if (err) {
									console.log(err);
								}
								her_point_plusone(her_id);
     							connection.release();
     						});
     					}
     				});

     				res.send({
     					success: true,
     					message: 'vote success',
     					data: null
     				});
     			}
     		});
		}
		else {
			res.send({
				success: false,
				message: "login please",
				data: null
			});
		}
	});

	app.listen(http_port);

	console.log("Http started and listen on http://127.0.0.1:" + http_port);
}

// Load all her from our file
// So that we cache them into memory and load it very fast
(function (callback) {
	var dir = __dirname + "/her";
	fs.readdir(dir, function (err, files) {
		var hers = global.hers = [];
		_.each(files, function  (file) {
			try {
				var content = JSON.parse(fs.readFileSync(dir + "/" + file, "utf8"));
				hers.push(content);
			}
			catch (e) {
				console.error(file + " json error");
				process.exit();
			}
		});
		// init her into database
		mysql.getConnection(function (err, connection) {
			if (err) {
				console.log(err);
			}
			else {
				connection.query("SELECT * FROM her", function (err, data) {
					if (err) {
						console.log(err);
					}
					else {
						var hersInserting = [];
						_.each(hers, function (her, index) {
							var isExist = false;
							_.each(data, function (herInDB) {
								if (herInDB["her_id"] == her["id"]) {
									isExist = true;
									// update point
									hers[index]["point"] = herInDB["point"];
								}
							});
							if (!isExist) {
								// insert new record
								hersInserting.push([her["id"], 1]);
							}
						});
						var v = '';
						for (i=0; i < hersInserting.length; i++) {
							v += '(?,?),';
						}
						if (v != '') {
							v = v.substring(0, v.length - 1);
							var params = _.flatten(hersInserting);
							connection.query("INSERT INTO her VALUES " + v, params, function (err) {
								if (err) {
									console.log(err);
								} 
								connection.release();
							});
						}
					}
				});
			} 
		});
		callback(hers);
	});
})(init);



