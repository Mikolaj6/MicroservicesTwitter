var express = require('express');
const bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
// const path = require('path');
// const url = require('url');
const fileUpload = require('express-fileupload');
var csrf = require('csurf')
const fetch = require("node-fetch");
var redis = require('redis');
var jwt = require('jsonwebtoken');
var app = express();

app.use(cookieParser());

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'));

var parseForm = bodyParser.urlencoded({ extended: false })
var csrfProtection = csrf({ cookie: true })

app.use(fileUpload());
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

// Constants for connections
const usersServer = 'users:2000'
const postsServer = 'posts:2000'
const relationsServer = 'relations:2000'
const redisServerHostname = 'redis'
const redisServerPort = '6379'
const JWT_SECRET = "SHHHHHH"
const JWT_EXPIRATION_SECONDS = 3600
const POSTS_TIME_DIFF = 1000 * 3600 * 24;

// Constants for connections
var mainHandler = redis.createClient(redisServerPort, redisServerHostname);


//ROUTING
mainHandler.on('connect', function () {
    console.log('RegistrationHandler connected to Redis...');
});

app.get('/login', redirectWhenLogged, csrfProtection, function (req, res) {
    res.render('login', { csrfToken: req.csrfToken() });
});

app.get('/register', csrfProtection, function (req, res) {
    res.render('register', { csrfToken: req.csrfToken() });
});

app.get('/failedLogin', function (req, res) {
    res.render('failedLogin');
});

app.get('/failedRegister', function (req, res) {
    res.render('failedRegister');
});

app.get('/unauthorized', function (req, res) {
    res.render('unauthorized');
});

app.get('/logout', verifyToken, function (req, res) {
    req.session.destroy();
    res.redirect('login');
});

app.get('/resetDatesOnYourPosts', verifyToken, function (req, res) {
    
    if (req.session.users) {
        req.session.users = {}
        console.log("DEBUG: Reseted dates")
    }

    res.send();
});

app.get('/mainPage', verifyToken, csrfProtection, function (req, res) {
    console.log("DEBUG: Checking res.locals.username:" + res.locals.username)

    res.render('mainPage', { username: res.locals.username, csrfToken: req.csrfToken() });
});

app.get('/posts/refresh/:user', verifyToken, async function (req, res) {
    console.log("DEBUG: CurrentlrefreshUpdatePostRequestTimesy displaying posts")
    let tmp

    if(!req.params.user) {
        console.log('DEBUG: ERROR user undefined')
        return res.send();
    }

    tmp = refreshUpdatePostRequestTimes(req.params.user, req.session)
    if(!tmp) {
        return res.send();
    }
    
    let request = 'http://' + postsServer + '/posts/' + req.params.user + '/' + req.session.users[req.params.user].starting + '/' + tmp
    let responseProcessed = await doRequest(request)

    if (!responseProcessed) {
        console.log("DEBUG: refresh responseProcessed empty")
        return res.send();
    } else {
        return res.send(responseProcessed);
    }
});

app.get('/myObserved', verifyToken, async function (req, res) {
    console.log("DEBUG: Asked for observed by:" + res.locals.username)

    let request = 'http://' + relationsServer + '/observing/' + res.locals.username
    let response = await doRequest(request)

    res.send(response);
});

app.get('/posts/getMorePosts/:user', verifyToken, async function (req, res) {
    console.log("DEBUG: Currently displaying posts")

    if (!req.params.user) {
        console.log('DEBUG: ERROR user undefined')
        return res.send();
    }

    getMoreUpdatePostRequestTimes(req.params.user, req.session);

    let request = 'http://' + postsServer + '/posts/' + req.params.user + '/' + req.session.users[req.params.user].last + '/' + (req.session.users[req.params.user].last - POSTS_TIME_DIFF).toString()
    let responseProcessed = await doRequest(request);

    if (!responseProcessed) {
        console.log("DEBUG: getMorePosts responseProcessed empty");
        return res.send();
    } else {
        return res.send(responseProcessed);
    }
});

app.get('/refreshFeed', verifyToken, async function (req, res) {
    console.log("DEBUG: request for older feed")
    let result = await getMoreFeedOrRefresh(req, res, true);
    if (!result) {
        res.send()
    } else {
        res.send(result)
    }
});

app.get('/getOlderFeed', verifyToken, async function (req, res) {
    console.log("DEBUG: request for more feed")
    let result = await getMoreFeedOrRefresh(req, res, false);
    if(!result) {
        res.send()
    } else {
        res.send(result)
    }
});

app.post('/dolog', parseForm, csrfProtection, function (req, res) {
    if (!req.body.nick || !req.body.password) {
        res.redirect('failedLogin')
    } else {
        fetch('http://' + usersServer + '/login/' + req.body.nick + '/' + req.body.password).then(response => {
            return response.json()
        }).catch(response => {
            console.log('DEBUG: error reading Json in dolog')
            return res.redirect('failedLogin')
        }).then(response => {
            if (!response) {
                console.log('DEBUG: Response is null or undefined (probably did not receive an answer');
                return res.redirect('failedLogin')
            }

            if (response['loginStatus'] == true) {
                console.log('DEBUG: Begining generating token')

                if(!generateNewToken(req.body.nick, req)) {
                    console.log('DEBUG: failuresigning the token')
                    return res.redirect('failedLogin')
                }
                
                console.log('DEBUG: loggin success and token created token:' + req.session.token)
                return res.redirect('mainPage')
            } else {
                console.log('DEBUG: user entered wrong credentials')
                return res.redirect('failedLogin')
            }
        });
    }
});

app.post('/doreg', parseForm, csrfProtection, function (req, res) {
    if (!req.body.nick || !req.body.password) {
        return res.redirect('failedRegister')
    } else {
        if (!validateUsernameAndPassword(req.body.nick, req.body.password)) {
            console.log('Entered bad credentials')
            return res.redirect('failedRegister')
        }

        mainHandler.publish("registration", "|USERNAME:" + req.body.nick + "|PASSWORD:" + req.body.password + "|");
        res.redirect('login')
    }
});

app.post('/newPost', verifyToken, parseForm, csrfProtection, function (req, res) {

    if (!validateNewPost(req.body.title, req.body.contents)) {
        console.log("DEBUG: Post invalid")
    } else {
        let date = Date.now()
        mainHandler.publish("newPosts", res.locals.username + "|" + req.body.title + "|" + date + "|" + req.body.contents);
    }
    
    res.redirect('mainPage')
});

app.post('/newObserved', verifyToken, parseForm, csrfProtection, function (req, res) {
    if (!validateUsername(req.body.userObserved) || res.locals.username === req.body.userObserved) {
        console.log("DEBUG: Observation invalid")
    } else {
        mainHandler.publish("newObservations", res.locals.username + "|" + req.body.userObserved);
    }

    res.redirect('mainPage')
});

const port = 3000

app.listen(port, () => console.log(`App listening on port ${port}!`))

// MIDLEWARE

function verifyToken(req, res, next) {
    let token = req.session.token
    if (!token) {
        console.log("DEBUG: No token was set")
        return res.redirect('unauthorized')
    }

    try {
        let decoded = jwt.verify(token, JWT_SECRET);
        if (!generateNewToken(decoded.username, req)) {
            console.log("DEBUG: Error generating new token in middleware")
            return res.redirect('unauthorized')
        }
        res.locals.username = decoded.username;  
    } catch (err) {
        console.log("DEBUG: Error decoding token")
        console.log(err.message)
        return res.redirect('unauthorized')
    }
    next();
}

function redirectWhenLogged(req, res, next) {
    let token = req.session.token
    if (!token) {
        console.log("DEBUG: No token was set")
        return next();
    }

    try {
        jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return next();
    }
    res.redirect('mainPage')
}

// HELPER FUNCTIONS

function validateUsernameAndPassword(username: string, password: string) {
    if (username.match("^[A-z0-9*!]+$") && password.match("^[A-z0-9*!]+$") && username.length <= 30 && password.length <= 30 && username.length >= 4 && password.length >= 4) {
        return true
    } else {
        return false
    }
}

function validateUsername(username: string) {
    if (username.match("^[A-z0-9*!]+$") && username.length <= 30 && username.length >= 4) {
        return true
    } else {
        return false
    }
}

// Returns true when token was succesfully generated, false otherwise
function generateNewToken(userName, req) {
    let newToken

    try {
        newToken = jwt.sign({ username: userName }, JWT_SECRET, { expiresIn: JWT_EXPIRATION_SECONDS });
    } catch (err) {
        console.log('DEBUG: failuresigning the token')
        return false
    }

    if (!newToken) {
        console.log('DEBUG: Token set to undefined')
        return false
    }

    req.session.token = newToken
    return true
}

function validateNewPost(newPostTitle, newPostContent) {

    if (!newPostTitle || !newPostContent || newPostTitle.length === 0 || newPostContent.length === 0) {
        return false;
    } else {
        if (newPostTitle.length >= 30) {
            return false;
        }
        if (newPostContent.length >= 200) {
            return false;
        }
        if (newPostContent.includes(';') || newPostContent.includes('|')) {
            return false;
        }
        if (newPostTitle.includes(';') || newPostTitle.includes('|')) {
            return false;
        }

        return true;
    }
}

async function doRequest(request) {
    let response
    try {
        response = await fetch(request);
    } catch (err) {
        console.log("DEBUG: response empty, fetch failed")
        return null
    }

    let responseProcessed
    try {
        responseProcessed = await response.json()
    } catch (err) {
        console.log("DEBUG: responseProcessed empty, json convertion failed")
        return null
    }

    return responseProcessed
}

// Returns null when error occured and no request should be made
function refreshUpdatePostRequestTimes(userName, session) {
    if (!session.users) {
        session.users = {};
    }
    if (!session.users[userName]) {
        session.users[userName] = {};
    }
    if (!session.users[userName].starting) {
        console.log("DEBUG: THIS CODE SHOULD NOT EXECUTE")
        return null;
    } else {
        let tmp = session.users[userName].starting
        session.users[userName].starting = Date.now()
        return tmp;
    }
}

function getMoreUpdatePostRequestTimes(userName, session) {
    if (!session.users) {
        session.users = {};
        console.log("DEBUG: creating and array")
    }
    if (!session.users[userName]) {
        console.log("DEBUG: creating object for " + userName)
        session.users[userName] = {};
    }

    if (!session.users[userName].last) {
        session.users[userName].starting = Date.now()
        session.users[userName].last = Date.now()
        console.log("DEBUG: STARTING:" + session.users[userName].starting)
    } else {
        session.users[userName].last -= POSTS_TIME_DIFF
        console.log("DEBUG: AGAIN:" + session.users[userName].last)
    }
}

async function getMoreFeedOrRefresh(req, res, refresh) {
    let request = 'http://' + relationsServer + '/observing/' + res.locals.username
    let response = await doRequest(request)

    if (!response)
        return null;

    let finalResponse = []

    for (let elem in response) {
        let observed = response[elem].observed
        console.log("DEBUG: Currently building feed from " + observed)

        let request
        if (!refresh){
            getMoreUpdatePostRequestTimes(observed, req.session);
            request = 'http://' + postsServer + '/posts/' + observed + '/' + req.session.users[observed].last + '/' + (req.session.users[observed].last - POSTS_TIME_DIFF).toString()
        } else {
            let tmp = refreshUpdatePostRequestTimes(observed, req.session)
            if (!tmp) {
                return null;
            }
            request = 'http://' + postsServer + '/posts/' + observed + '/' + req.session.users[observed].starting + '/' + tmp
        }

        let responseProcessed = await doRequest(request);

        for (let postIdx in responseProcessed) {
            responseProcessed[postIdx].observed = response[elem].observed
        }
        finalResponse.push(...responseProcessed)
    }

    finalResponse.sort(function (a, b) { 
        return b.date - a.date;
    });

    console.log("DEBUG: finalResponse: %j", finalResponse);
    return finalResponse;
}