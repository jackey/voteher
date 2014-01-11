module.exports = {
	"http_port": "3001",
	"proxy": {
		"worker_a": "http://127.0.0.1:3002",
		"worker_b": "http://127.0.0.1:3003"
	},
	"mysql": {
		"host": "localhost",
		"user": "root",
		"password": "admin",
		"database": "voteher"
	},
	"weibo": {
		"key": "1470810749",
		"secret": "da23479ce6d4fa364288770c7c66a7f5",
		"auth_callback": "http://apps.weibo.com/voteher"
	}
}