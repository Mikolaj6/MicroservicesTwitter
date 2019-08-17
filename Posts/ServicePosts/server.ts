var express = require('express');
// var session = require('express-session')
// var cookieParser = require('cookie-parser')
const bodyParser = require('body-parser');
var redis = require('redis');
// var bcrypt = require('bcrypt');
import * as sqlite3 from 'sqlite3';

// const path = require('path');
// const url = require('url');
// const fileUpload = require('express-fileupload');
// var csrf = require('csurf')


// var csrfProtection = csrf({ cookie: true })
var app = express();
// app.use(cookieParser())

// app.engine('html', require('ejs').renderFile);
// app.set('view engine', 'html');
// app.use(express.static(__dirname + '/public'));

// app.use(fileUpload());
// app.use(session({
// secret: 'secret',
// resave: true,
// saveUninitialized: true
// }));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Constants for connections
let redisServerHostname = 'redis'
let redisServerPort = '6379'

var registrationHandler = redis.createClient(redisServerPort, redisServerHostname);

registrationHandler.on('connect', function () {
    console.log('NewPostsHandler connected to Redis...');
});

let usersDb = new sqlite3.Database('PostsDb');

// Temporary database initialization
usersDb.serialize(() => {
    usersDb.run('DROP TABLE IF EXISTS posts;');
    usersDb.run('CREATE TABLE posts (creator varchar(30), title varchar(30), date INTEGER, contents varchar(220));');
});

// ROUTING
app.get('/posts/:user/:from/:to/', async function (req, res) {
    console.log("DEBUG: Request for user:" + req.params.user + ": for posts from:" + req.params.from + " to:" + req.params.to);
    if (!req.params.user || !req.params.from || !req.params.to) {
        console.log("DEBUG: WARNING EMPTY USER NAME")
        return res.send()
    } else {
        let sql = "SELECT title, date, contents FROM posts WHERE creator = ? AND date BETWEEN ? AND ? ORDER BY date DESC"
        let from = req.params.from < req.params.to ? req.params.from : req.params.to;
        let to = req.params.from < req.params.to ? req.params.to : req.params.from;

        let result = await sqlCmdAll(usersDb, sql, [req.params.user, from, to]);
        if(!result || !result[0]) {
            console.log("DEBUG: some error occured in quering data")
            res.send()
        } else {
            res.send(result[1])
        }
    }
});

registrationHandler.on("message", function (channel, newPost) {
    console.log("DEBUG: Received registration request chanel:" + channel + "|newPost:" + newPost)
    // First split then add to database

    var postArr = newPost.split('|');

    let sql = 'INSERT INTO posts(creator, title, date, contents) VALUES (?, ?, ?, ?)';
    
    sqlCmdRun(usersDb, sql, [postArr[0], postArr[1], postArr[2], postArr[3]]);
});

registrationHandler.subscribe("newPosts");

const port = 2000

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

// Database management 

// Takes database, sql command and parameters returns boolean informing about success
async function sqlCmdRun(database, sql, parms) {
    let sqlCmd = new Promise((resolve, reject) => {
        database.run(sql, parms, function (err) {
            if (err) {
                console.log(err.message);
                reject();
            }
            resolve();
        });
    });

    try {
        await sqlCmd
        console.log("DEBUG: Succesfully ran command:" + sql)
        return true;
    } catch {
        console.log("DEBUG: COUGHT ERROR IN sqlCmdRun sql:" + sql)
        return false;
    }
}

async function sqlCmdAll(database, sql, parms) {
    let sqlCmd = new Promise((resolve, reject) => {
        database.all(sql, parms, (err, rows) => {
            if (err) {
                reject(err);
            }
            resolve(rows);
        });
    });

    try {
        let val = await sqlCmd
        return [true, val];
    } catch (err) {
        console.log(err.message);
        console.log("DEBUG: COUGHT ERROR IN sqlCmdGet sql:" + sql)
        return [false, null];
    }
}