const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;

const app = express();

let scraper = require('./helpers/scraper');
let firebaseHelper = require('./db/FirebaseHelper');

// Middleware to fill the request body
let rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

app.use(bodyParser.json({
  verify: rawBodySaver
}));
app.use(bodyParser.urlencoded({
  verify: rawBodySaver,
  extended: true
}));
app.use(bodyParser.raw({
  verify: rawBodySaver,
  type: function () {
    return true
  }
}));

app.post('/sms', async (req, res) => {
  const twiml = new MessagingResponse();

  const prefix = '!';
  /**
   * IMPORTANT: USE req.body.Body for production and req.rawBody for local testing
   */
  console.log(JSON.stringify(req.body, null, 2));
  console.log(`Number: ${req.body.From}`);
  let message = req.rawBody;
  //let message = req.rawBody;
  if (message.startsWith(prefix)) {
    let args = message.slice(prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();

    if (command === 'test') {
      console.log('Test was sent');
      twiml.message('Test was sent');
    }

    if (command === 'drives') {
      let zip = args[0];
      console.log(zip);
      if (!zip) {
        console.log('no zip');
        twiml.message('Please input a zip code. Usage: !drives <zipcode>');
      } else {
        let drives = await scraper.getTimes(zip);
        twiml.message(JSON.stringify(drives, null, 2));
      }
    }

    // registers new users
    if (command === 'register') {
      let phoneNumber = ""; // for tesing locally
      // let phoneNumber = req.body.From; Add this back for production s
      let registered = await firebaseHelper.createNewUser(phoneNumber);
      console.log(registered);
      if (registered) {
        // probably a message to show a list of commands
        console.log("You are registered");
        console.log("Here are a list of commands.");
        console.log("To get nearby Blood Drives: !drives <zipcode>");
        console.log("To get your statistics: !stats");
        console.log("To see your next eligiblity date: !eligibility");
        console.log("If you have donated today: !donated");
        // twiml.message("You are registered!")
      } else {
        console.log("You exist");
      }
    }

    // return user stats
    if (command === 'stats') {
      let phoneNumber = '253'; // for tesing locally
      // let phoneNumber = req.body.From; Add this back for production s

      let userStats = await firebaseHelper.getUserStats(phoneNumber);
      console.log(userStats);
    }

    // just Donated
    if (command === 'donated') {
      let phoneNumber = '253';
      let donated = await firebaseHelper.justDonated(phoneNumber);
      await console.log(donated);
    }
  }
  //twiml.message(`You typed: ${message}`);

  res.writeHead(200, {
    'Content-Type': 'text/xml'
  });
  res.end(twiml.toString());
});

let port = process.env.PORT || 5000;
http.createServer(app).listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});