// server.js
// set up ======================================================================
require('dotenv').config();
const coindesk = require('node-coindesk-api')
var request = require("request");
var dateFormat = require('dateformat');
var CronJob = require('cron').CronJob;

var twilio = require('twilio');
var client = new twilio (process.env.TWILIO_ACCOUNT_SID,process.env.TWILIO_AUTH_TOKEN); 

var express  = require('express');
var app      = express();
var port     = process.env.PORT || 3001;
var mongoose = require('mongoose');
var flash    = require('connect-flash');

var morgan       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');

// Require Article Schema
var User = require("./models/user");
var now = new Date();

// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;

// Configuration ===============================================================
//mongoose.connect(configDB.url); // connect to our local database

// Database configuration with Mongoose ========================================
// Define local MongoDB URI 
var databaseUri = "mongodb://localhost/bitcoin";
  	if (process.env.MONGODB_URI) {
// THIS EXCUTES IF THIS IS BEING EXCUTED IN HEROKU APP 	
    	mongoose.connect(process.env.MONGODB_URI);
    }else{
// THIS EXCUTES IF THIS IS BEING EXCUTED ON LOCAL MACHINE 
    	mongoose.connect(databaseUri);
  	}
// End of Database configuration ===============================================

var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static("public"));

// Main "/" Route. This will redirect the user to our rendered React application
app.get("/", function(req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

app.use(flash()); // use connect-flash for flash messages stored in session


// launch ----------------------------------------------------------------------
app.listen(port);
console.log('The magic happens on port ' + port);


// CoinBase API ================================================================
var queryUrl = "https://api.coinbase.com/v2/prices/BTC-USD/buy";
var Coin = require('coinbase').Client;
var coin = new Coin({'apiKey': process.env.API_KEY,
                         'apiSecret': process.env.API_SECRET});

	// coin.getSpotPrice({'currencyPair': 'ETH-USD', 'date':'2010-01-01'}, function(err, price) {
	//   console.log(price);
	// });

var textMessage = "null";
var entryPrice = 2429;

// Function to check current price via CoinBase ================================
function checkCurrentPrice(){
	request(queryUrl, function(error, response, body) {
	
	// If user has empty input 
 	if(!error && response.statusCode === 200) {
 	// Display output 
    	var currentPrice = JSON.parse(body).data.amount;
    	var ans = ((currentPrice - entryPrice)/entryPrice) *100;
    	var percentChange = Math.round(ans*100)/100;
    
    	if (ans <= 0) {
      		var textMessage = dateFormat(now) + "\n" + "percent change "+ percentChange + "%"+ "\n" +
                      "Current Price $" + currentPrice + "\n" + " Buy now!";
      		console.log(percentChange);
      		console.log(textMessage);
      		sendMessage(textMessage);

    // if ans is greater than 20 then "Sell now!"   		
    	}else if (ans >= 20){
      		var textMessage = dateFormat(now) + "\n"+ "percent change " + percentChange +"%"+ "\n" +
                      "Current Price $" + currentPrice + "\n" + " Sell now!";
      		console.log(percentChange);
      		console.log(textMessage);
      		sendMessage(textMessage);
    	}else{ 
    		return;  // No action taken
    		}
		}
	});
};// End of function  =============================================================

// Function to send text message via Twilio =======================================
function sendMessage(textMessage){
  checkCurrentPrice();
console.log(process.env.TWILIO_PHONE)
client.messages.create({
    body: textMessage, 
    to: process.env.MY_PHONE,  // Text this number
    from: process.env.TWILIO_PHONE // From a valid Twilio number
})
.then((message) => console.log(message.sid))
}// End of function  ==============================================================


// Cron Scheduling Job ============================================================
new CronJob('30 * * * * *', function() {
  console.log(dateFormat(now));
  console.log('You will see this message every hour');
}, null, true, 'America/Los_Angeles');
// End of function  ===============================================================


// Post route to save to Mongo
app.post('/api/saved', function(req, res) {
 
  var content = new User(req.body);
  content.save(req.body, function(err, saved) {
    if (err) {
      console.log('Mongo Error',err);
    } else {
      console.log('Data has been saved',saved);
      res.send(saved);
    }
  });
});
