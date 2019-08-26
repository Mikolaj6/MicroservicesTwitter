const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('commonDb.db', [], (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Succesfully connected in setup');
});

db.serialize(() => {
    db.run('DROP TABLE IF EXISTS posts;');
    db.run('DROP TABLE IF EXISTS relations;');
    db.run('DROP TABLE IF EXISTS userData;');

    db.run('CREATE TABLE userData (username TEXT  NOT NULL, password TEXT  NOT NULL, PRIMARY KEY(username));');
    db.run('CREATE TABLE posts (creator TEXT  NOT NULL, title TEXT  NOT NULL, date INTEGER, contents TEXT, FOREIGN KEY(creator) REFERENCES userData(username));');
    db.run('CREATE TABLE relations (observer TEXT  NOT NULL, observed TEXT  NOT NULL, PRIMARY KEY(observer, observed), FOREIGN KEY(observed) REFERENCES userData(username), FOREIGN KEY(observer) REFERENCES userData(username));');
});
db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Close the database connection.');
});