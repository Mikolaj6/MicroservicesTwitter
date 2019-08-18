var express = require('express');
const bodyParser = require('body-parser');
var redis = require('redis');
import * as sqlite3 from 'sqlite3';

var app = express();

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Constants for connections
let redisServerHostname = 'redis'
let redisServerPort = '6379'

var relationsHandler = redis.createClient(redisServerPort, redisServerHostname);

relationsHandler.on('connect', function () {
    console.log('RegistrationHandler connected to Redis...');
});

let relationsDb = new sqlite3.Database('commonDb.db');

// Routing
app.get('/observing/:user', async function (req, res) {
    console.log("DEBUG: Request for user:" + req.params.user);
    if (!req.params.user) {
        console.log("DEBUG: WARNING EMPTY USER NAME")
        return res.send()
    } else {
        let sql = "SELECT observed FROM relations WHERE observer = ? ORDER BY observed DESC"

        let result = await sqlCmdAll(relationsDb, sql, [req.params.user]);
        if (!result || !result[0]) {
            console.log("DEBUG: some error occured in quering data")
            res.send()
        } else {
            res.send(result[1])
        }
    }
});

relationsHandler.on("message", async function (channel, observationData) {
    console.log("DEBUG: Received registration request chanel:" + channel + "|observationData:" + observationData)
    // First validate received string

    var postArr = observationData.split('|');

    let sql = 'INSERT INTO relations(observer, observed) VALUES (?, ?)';

    sqlCmdRun(relationsDb, sql, [postArr[0], postArr[1]]);
});

relationsHandler.subscribe("newObservations");

const port = 2000

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

// Helper functions
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