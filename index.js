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

// Front handler
function frontRouter(req, res) {
<<<<<<< HEAD
	if (req.body) {
		console.log(req.body);
=======
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
>>>>>>> 8ff97aced5c15b9ee352c3f27bc38b4f9119c0c8
	}
	fs.readFile("./index.html", {encoding: "utf8"}, function (err, html) {
		res.writeHeader(200, {"Content-Type": "text/html"});  
        res.write(html); 
        res.end();
	});
}

// setup server
function init(hers, pages) {
	var app = express();
<<<<<<< HEAD
 	
 	app.use(express.bodyParser());
 	app.use(express.cookieParser("voteher"));
	app.use(express.cookieSession({path: "/", httpOnly: true, maxAge: null, secret: "voteher", key: "votehersess"}));
=======

	app.use(express.bodyParser());
	app.use(express.cookieParser("voteher"));
	app.use(express.session({secret: "voteher", key: "voteher"}));
>>>>>>> 8ff97aced5c15b9ee352c3f27bc38b4f9119c0c8
	app.use(express.static(__dirname + "/public"));

	app.get("/allher", function (req, res) {
		res.json(hers);
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
     		if (!her_id) {
     			return res.send({
     				success: false,
     				message: "Her id missed",
     				data: null
     			});
     		}
     		console.log("start");
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
     						// update vote count
     						
     					}
     					connection.release();
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
		var hers = global.users = [];
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
		callback(hers);
	});
})(init);



