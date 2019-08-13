var express = require('express');
// var session = require('express-session')
// var cookieParser = require('cookie-parser')
const bodyParser = require('body-parser');
var redis = require('redis');
var bcrypt = require('bcrypt');
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
let redisServerHostname = 'users_redis'
let redisServerPort = '6379'

var registrationHandler = redis.createClient(redisServerPort, redisServerHostname);

registrationHandler.on('connect', function () {
    console.log('RegistrationHandler connected to Redis...');
});

let usersDb = new sqlite3.Database('UsersDb');

// Temporary database initialization
usersDb.serialize(() => {
    usersDb.run('DROP TABLE IF EXISTS userData;');
    usersDb.run('CREATE TABLE userData (username varchar(30), password varchar(30));');
});

// ROUTING
app.get('/login/:nick/:password', async function (req, res) {
    console.log("DEBUG: Login request received")
    if (!req.params.nick || !req.params.password) {
        return res.send({ loginStatus: false })
    } else {
        await respondLogin(req.params.nick, req.params.password, res)
    }
});

registrationHandler.on("message", async function (channel, registrationData) {
    console.log("DEBUG: Received registration request chanel:" + channel + "|registrationData:" + registrationData)
    // First validate received string

    var username = retreiveUsername(registrationData)
    var password = retreivePassword(registrationData)

    if (!validateUsernameAndPassword(username, password)) {
        return console.log("DEBUG: Password wasn't valid")
    } else {
        console.log("DEBUG: Password consists of correct characters")
    }

    let registerNewUser = `INSERT INTO userData(username, password) VALUES(?, ?)`;
    let sqlIsSuchUser = `SELECT username User FROM userData WHERE username = ?`;

    let tmpDB = new sqlite3.Database('UsersDb')

    if (!await sqlCmdRun(tmpDB, 'BEGIN TRANSACTION', [])) {
        return
    }

    console.log("DEBUG: IN BEGIN TRANSACTION")

    let val = await sqlCmdGet(tmpDB, sqlIsSuchUser, [username])
    if (!val[0]) {
        return await sqlCmdRun(tmpDB, 'ROLLBACK', [])
    } else {
        if (val[1]) {
            console.log("DEBUG: Already such user row:" + (val[1] as any).User + " val[1]: " + val[1])
            return await sqlCmdRun(tmpDB, 'ROLLBACK', [])
        }
    }

    console.log("DEBUG: BEGINING HASHING PASSWORD")
    let hashedPassword = await hashPassword(password)
    if (hashedPassword === null) {
        return await sqlCmdRun(tmpDB, 'ROLLBACK', [])
    }

    if (!await sqlCmdRun(tmpDB, registerNewUser, [username, hashedPassword])) {
        return await sqlCmdRun(tmpDB, 'ROLLBACK', [])
    }

    console.log("DEBUG: JUST BEFORE COMMIT")
    return await sqlCmdRun(tmpDB, 'COMMIT', [])
});

registrationHandler.subscribe("registration");

const port = 2000

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

//--// Database management, some promises

// Takes in login data and responds weather login was successful
async function respondLogin(username: string, password: string, res) {
    let sql = `SELECT password passwordEncrypted
           FROM userData
           WHERE username  = ?`;

    let encryptedPassword    
    let val = await sqlCmdGet(usersDb, sql, [username])
    if (val[0] && val[1]) {
        console.log("DEBUG: retreived passwordEncrypted:" + (val[1] as any).passwordEncrypted)
        encryptedPassword = (val[1] as any).passwordEncrypted
    } else {
        console.log("DEBUG: No such user in database")
        return res.send({ loginStatus: false }) 
    }
    
    if (await isLoginCorrect(password, encryptedPassword)){
        console.log("DEBUG: Provided login credentails are acurate, yey!!!")
        res.send({ loginStatus: true })
    } else {
        console.log("DEBUG: Provided login credentails are inacurate")
        res.send({ loginStatus: false })
    }
}

// Decrypts the password and checks if it matches given password (true if matches, false otherwise)
async function isLoginCorrect(password: string, passwordEncrypted: string) {
    let cmd = new Promise((resolve, reject) => {
        bcrypt.compare(password, passwordEncrypted, function (err, res) {
            if (err) {
                console.log(err.message)
                reject();
            }

            if (res) {
                console.log("DEBUG: Correct login");
                resolve();
            } else {
                console.log("DEBUG: Entered wrong password");
                reject();
            }
        });
    });

    try {
        await cmd
        return true
    } catch {
        return false
    }
}

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

// Takes database, sql command and parameters returns pair informing about success and value of get
async function sqlCmdGet(database, sql, parms) {
    let sqlCmd = new Promise((resolve, reject) => {
        database.get(sql, parms, (err, row) => {
            if (err) {
                reject(err);
            }
            resolve(row);
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

async function hashPassword(password) {
    let cmd = new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, function (err, hashedPassword) {
            if (err) {
                console.log("DEBUG: error hashing password")
                reject();
            }
            console.log("DEBUG: unhashed password:" + password + "|hashedPassword:" + hashedPassword + "|")
            resolve(hashedPassword);
        });
    });

    try {
        let hashedPassword = await cmd
        return hashedPassword
    } catch {
        return null
    }
}


// HELPER FUNCTIONS, no promises


function retreiveUsername(registrationData: string) {
    let result = registrationData.match(/\|USERNAME:(.*)\|PASSWORD:/g);
    if (!result || result.length != 1 || result[0].length == "|USERNAME:|PASSWORD:".length) {
        return ""
    } else {
        return registrationData.substring("|USERNAME:".length, result[0].length - "|PASSWORD:".length)
    }
}

function retreivePassword(registrationData: string) {
    let result = registrationData.match(/\|PASSWORD:(.*)\|/g);
    if (!result || result.length != 1 || result[0].length == "|PASSWORD:|".length) {
        return ""
    } else {
        return result[0].substring("|PASSWORD:".length, result[0].length - "|".length)
    }
}

function validateUsernameAndPassword(username: string, password: string) {
    console.log("username|" + username + "|password|" + password + "|")
    if (username.match("^[A-z0-9*!]+$") && password.match("^[A-z0-9*!]+$") && username.length <= 30 && password.length <= 30 && username.length >= 4 && password.length >= 4) {
        return true
    } else {
        return false
    }
}