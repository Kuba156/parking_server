require('dotenv').config({path: __dirname + '/.env'})
var admin = require("firebase-admin");
var serviceAccount = require(process.env['CERT_PATH']);
var express = require("express");

const app = express();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env['DB']
});

var userTokens = [];
var jobs = [];
var currWaiting = [];

app.use(express.json())

app.post("/api/register", (req, res) => {
    try {
        if (req.body.token == undefined) {
            throw "token undefined";
        }
        userTokens.push(req.body.token)
        res.send("added");
    } catch (e) {
        res.send(e)
    }
});

app.post("/api/notifyany/:token", (req, res) => {
    try {
        currWaiting.push(req.params.token)
        res.json({lotid: 1})

    } catch (e) {
        res.send(e)
    }
});

app.post("/api/notify/:token", (req, res) => {
    try {
        if (Boolean(req.params.any) == true) { // customert wants to know about any lot getting free'd

        } else // customer is interested in a concrete parking lot getting free'd
        {
            if (req.body.lotid == undefined) {
                throw "token undefined";
            }
            var job = {
                lotnr: req.body.lotid,
                customer: req.params.token
            }
            jobs.push(job)
            res.send("Job scheduled " + job.lotnr + " will notify concrete lot for -> " + job.customer);
        }

    } catch (e) {
        res.send(e)
    }
});

// Get a database reference to our posts
var db = admin.database();
var ref = db.ref("parking1");

ref.on("value", function (snapshot) {
    snapshot.forEach(lot => { // there is a change in db
        if (lot.val().occupant == "none") { // there is a free place
            if (currWaiting.length > 0) { // there is someone waiting for free place, notify him
                var message = {
                    notification: {
                        title: 'Masz miejsce!',
                        body: 'Zwolnilo sie miejsce na parkingu: parking1'
                    }
                };

                var options = {
                    priority: "high",
                    timeToLive: 60 * 60 * 24
                };

                var registrationToken = currWaiting.shift();
                admin.messaging().sendToDevice(registrationToken, message, options)
                    .then((response) => {
                        console.log('Successfully sent message:', response);
                    })
                    .catch((error) => {
                        console.log('Error sending message:', error);
                    });
            }

        }
    })
}, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
});

app.listen(3000, () => console.log("listening on port 3000"));
