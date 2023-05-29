const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const crypto = require('crypto');
const helmet = require('helmet');
const toobusy = require('toobusy-js');
const session = require('express-session');
const https = require('https');
const fs = require('fs');
const config = require('config');

const debug = true; // TODO: Set false in production

const app = express();

app.set('view engine', 'ejs');

app.use(helmet());

app.use(function (req, res, next) {
    if (toobusy()) {
        res.status(503);
        res.send('Server too busy!');
    } else {
        next();
    }
});

let whitelist = config.get('cors.whitelist');
let corsOptions = {
    credentials: true,
    optionsSuccessStatus: 200,
    origin: function(origin, callback) {
        console.log(origin)
        if (debug || whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}
app.use(cors(corsOptions));

app.use(express.json());

app.use(session({
    genid: (req) => {
        return crypto.randomUUID() // generate a unique session ID
    },
    secret: 'bsd46as1ev?erqb1q!4124n1ncccbn3.d!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: 'none',
        maxAge: 60 * 60 * 24 * 1000
    },
}));

let mongoDbName = config.get('db.name');
let mongoDbUser = config.get('db.user');
let mongoDbPassword = config.get('db.password');
let mongoDbIp = config.get('db.ip');
let mongoDbPort = config.get('db.port');

mongoose.connect(`mongodb://${mongoDbUser}:${mongoDbPassword}@${mongoDbIp}:${mongoDbPort}/${mongoDbName}`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log("MongoDB connection error:" + err));

const routes = require("./routes");
app.use("/", routes);

const port = config.get('server.port');

const options = {
    key: fs.readFileSync(config.get('server.keyPath')),
    cert: fs.readFileSync(config.get('server.certPath'))
};

const server = https.createServer(options, app);

server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});