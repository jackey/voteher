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

var argv = require("optimist").argv;

// Make sure the listen port
if (argv["http_port"]) {
	var http_port = argv["http_port"];
}
else {
	var http_port = config["http_port"];
}

// Front handler
function frontRouter(req, res) {
	fs.readFile("./index.html", {encoding: "utf8"}, function (err, html) {
		res.writeHeader(200, {"Content-Type": "text/html"});  
        res.write(html);  
        res.end();
	});
}

// setup server
function init(hers, pages) {
	var app = express();

	app.use(express.static(__dirname + "/public"));

	app.get("/allhere", function (req, res) {
		res.json(hers);
	});

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



