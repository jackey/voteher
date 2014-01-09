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
	if (req.body) {
		console.log(req.body);
	}
	else {

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

	app.use(express.bodyParser());
	app.use(express.cookieParser("voteher"));
	app.use(express.cookieSession({secret: "voteher", key: "voteher"}));
	app.use(express.static(__dirname + "/public"));

	app.get("/allher", function (req, res) {
		res.json(hers);
	});

	app.post("/", frontRouter);
	app.get("/", frontRouter);

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



