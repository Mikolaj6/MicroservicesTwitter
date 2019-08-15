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
const redisServerHostname = 'users_redis'
const redisServerPort = '6379'
const JWT_SECRET = "SHHHHHH"
const JWT_EXPIRATION_SECONDS = 3600

// Constants for connections
var registrationHandler = redis.createClient(redisServerPort, redisServerHostname);


//ROUTING
registrationHandler.on('connect', function () {
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

app.get('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('login');
});

app.get('/mainPage', verifyToken, function (req, res) {
    console.log("DEBUG: Checking res.locals.username:" + res.locals.username)

    res.render('mainPage', { username: res.locals.username });
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

        registrationHandler.publish("registration", "|USERNAME:" + req.body.nick + "|PASSWORD:" + req.body.password + "|");
        res.redirect('login')
    }
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