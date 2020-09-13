const express = require('express')
const compression = require('compression')
const morgan = require('morgan')
var router = express.Router();
var bodyParser = require('body-parser');
var session = require('express-session')
var cors = require('cors')
const app = express();
app.use(cors())
const { uuid } = require('uuidv4');

const dev = app.get('env') !== 'production'
if (!dev) {
    app.disable('x-powered-by')
    app.use(compression())
    app.use(morgan('common'))
}

const port = process.env.PORT || 9000;
app.listen(port);


router.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))

app.get('/', function (req, res) { res.send('Hello!') });
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var db;
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://rakesh:uDrive@udrive.138if.mongodb.net/uDrive?retryWrites=true&w=majority', function (err, database) {
    if (err) return console.log("error ", err)
    db = database;
    console.log('App is listening on port ' + port);
})
app.post('/api/register', (req, res) => {
    var ObjectID = require('mongodb').ObjectID;
    var user = {
        phone: req.body.phone,
        password: req.body.password,
        role: req.body.selectedValue,
        _id: new ObjectID()
    };
    const query = db.collection('Registration').find({ phone: req.body.phone }).toArray(function (err, result) {
        console.log(result);
        if (result.length > 0) return res.json({ data: 'already registered' })
        else {
            db.collection('Registration').insertOne(user);
            res.json({ data: 'record added' })
        }

    });
})

app.post('/api/login', (req, res) => {
    var ObjectID = require('mongodb').ObjectID;
    var role, phone, carDetails = "true", number
    const query = db.collection('Registration').find({ phone: req.body.phone, password: req.body.password }).toArray(function (err, result) {
        console.log(result);
        if (result.length <= 0) return res.json({ data: 'no data' })
        // else return res.json({ data: 'data available' })
        else {
            result.map(data => {
                console.log("data.carDetails ", data.carDetails);
                if (data.carDetails === undefined) {
                    carDetails = "false"
                }
                role = data.role
                phone = data.phone
                if (data.carDetails !== undefined) {
                    number = data.carDetails.number
                }
            })
        }
        console.log("undefined ", carDetails);
        if (role === "Admin") return res.json({ data: "Admin", phone: phone })
        if (role === "Driver") return res.json({ data: "Driver", phone: phone, carDetails: number })
    })
});

app.post('/api/addTrip', (req, res) => {
    console.log(req.body);
    var ObjectID = require('mongodb').ObjectID;
    var today = new Date();
    var trip = {
        fromLat: req.body.fromLat,
        fromLong: req.body.fromLong,
        toLat: req.body.toLat,
        toLong: req.body.toLong,
        duration: req.body.duration,
        distance: req.body.distance,
        passengersCount: req.body.selectedValue,
        fromAddress: req.body.fromAddress,
        toAddress: req.body.toAddress,
        date: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
        status: "new trip",
        tripId: uuid(),
        rate: req.body.rate,
        _id: new ObjectID()
    };
    if (req.body.distance === 0) return res.json({ data: "No route for entered locations" })
    if (req.body.selectedValue === "number of passenger") return res.json({ data: "Enter number of passengers" })
    const query = db.collection('Trip').insertOne(trip);
    res.json({ data: 'trip added' })
});

app.get('/api/showTrip', (req, res) => {
    console.log("show trip api");
    var ObjectID = require('mongodb').ObjectID;
    const query = db.collection('Trip').find({}).toArray(function (err, result) {
        if (err) throw err;

        if (result.length <= 0) return res.json({ data: 'no data' })
        else {
            var data = result.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
            res.send(data)
        }

    });
})

app.post('/api/acceptTrip', (req, res) => {
    console.log("Accept trip ", req.body);
    var ObjectID = require('mongodb').ObjectID;
    const query = db.collection('Registration').find({ phone: req.body.phone }).toArray(function (err, result) {
        if (result.length <= 0) return res.json({ data: 'no data' })
        else {
            result.map(res => {
                res.carDetails.location = req.body.address
                res.carDetails.status = "pending"

                db.collection('Trip').find({ tripId: req.body.id }).toArray(function (err, success) {
                    {
                        success.map(i => {
                            {
                                i.hasOwnProperty('cabs') ?
                                    i.cabs.map(car => {
                                        if (car.number === req.body.carNumber) return res.json({ data: "already registered" });
                                        var query = db.collection('Trip').updateOne(
                                            { tripId: req.body.id },
                                            {
                                                $set: { "status": "applied" },
                                                $push: {
                                                    "cabs": res.carDetails
                                                },

                                            } ,

                                        )
                                    })
                                    : db.collection('Trip').updateOne(
                                        { tripId: req.body.id },
                                        {
                                            $set: { "status": "applied" },
                                            $push: {
                                                "cabs": res.carDetails
                                            },

                                        } ,

                                    )
                            }
                        })
                    }

                })
            })
        }
    })
    db.collection('Trip').find({}).toArray(function (err, result) {
        if (err) throw err;

        if (result.length <= 0) return res.json({ data: 'no data' })
        else {
            var data = result.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
            res.send(data)
        }

    });
})

app.post('/api/addCarDetails', (req, res) => {
    console.log("addCarDetails req.body ", req.body);
    var ObjectID = require('mongodb').ObjectID;
    var detials = {
        make: req.body.make,
        modal: req.body.modal,
        capacity: req.body.capacity,
        year: req.body.year,
        number: req.body.number
    };
    db.collection('Registration').updateOne(
        { phone: req.body.phone },
        {
            $set: { carDetails: { make: req.body.make, modal: req.body.modal, year: req.body.year, capacity: req.body.capacity, number: req.body.number } },
        }
    )
    res.json({ data: 'addCarDetails added' })
})

app.post('/api/showCabs', (req, res) => {
    console.log("show trip");
    var carDetails = []
    var ObjectID = require('mongodb').ObjectID;
    const query = db.collection('Registration').find({ role: "Driver", phone: req.body.phone }).toArray(function (err, result) {
        if (err) throw err;

        if (result.length <= 0) return res.json({ data: 'no data' })
        result.map(res => {
            console.log("result ", res);
            carDetails = res
        })
        res.json(carDetails)
    });
})

app.post('/api/acceptCab', (req, res) => {
    console.log(req.body);

    var ObjectID = require('mongodb').ObjectID;
    var phoneNumber = req.body.phone
    const query = db.collection('Trip').find({ tripId: req.body.tripId }).toArray(function (err, result) {
        if (result.length <= 0) return res.json({ data: 'no data' })
        else {
            result.map(res => {
                console.log("latitude, longitude ", res.cabs);
                {
                    (res.cabs).map(cab => {
                        if (cab.number === req.body.carNumber) {
                            cab.status = "approved"
                            console.log(cab.status);
                            db.collection('Trip').updateOne(
                                { tripId: req.body.tripId, "cabs.number": cab.number },
                                {
                                    $set: { "status": "closed", "cabs.$.status": 'approved' },
                                } ,
                            )
                        }
                    })
                }


            })

        }
        db.collection('Trip').find({}).toArray(function (err, result) {
            if (err) throw err;

            if (result.length <= 0) return res.json({ data: 'no data' })
            else {
                var data = result.sort((a, b) => (a.date > b.date) ? -1 : ((b.date > a.date) ? 1 : 0));
                res.send(data)
            }

        });
    })

})

module.exports = router;

