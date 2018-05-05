'use strict'

require('dotenv').config()
let mongojs = require('mongojs');

let Email = require('./models/email')
let nodemailer = require('nodemailer')
let db = mongojs('localhost:27017/mailer');
let schedule = require('node-schedule');

let express = require('express')
let bodyParser = require('body-parser')
let urlencodeParser = bodyParser.urlencoded({extended: false})

let historyCollection = db.collection('history');
let app = express()
let debug = false

app.set('port', process.env.PORT)
app.set('view engine', 'ejs')

// chỉ định thư mục static
app.use(express.static(`${__dirname}/public`))

app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})) // for parsing application/x-www-form-urlencoded

app.get('/', (req, res) => {
    res.status(200).render('index')
})

app.post('/sendMail', urlencodeParser, function (req, res) {
  if (debug) console.log('got send email request')
  if (!validateEmail(req.body)) {
    res.status(200).render('submit-mail-err')
  } else {
    let email = parseEmailFromRequest(req)
    writeEmailToDatabase(email)
    let date = new Date(email.getSendOn());

    let taskBackground = schedule.scheduleJob(date, function () {
          console.log('magic');
          sendMail(email);
    });

    return res.status(200).render('submit-mail-success')
  }
})

app.listen(app.get('port'), () => {
  console.log(`app listening at http://localhost:${app.get('port')}`)
})

function parseEmailFromRequest (req) {
  let email = new Email()

  email.setFrom(req.body.from_email)
  email.setFromName(req.body.from_name)
  email.setTo(req.body.to_email)
  email.setToName(req.body.to_name)
  email.setSubject(req.body.subject)
  email.setMessage(req.body.message)
  email.setSendOn(new Date(req.body['send_on']).getTime())

  return email
}

function validateEmail (email) {
  return !!email['from_email']
  && !!email['from_name']
  && !!email['to_email']
  && !!email['to_name']
  && !!email['subject']
  && !!email['message']
  && !!email['send_on']
  && new Date(email['send_on']) > Date.now()
}

function sendMail (email) {
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
  })

  var mailOptions = {
    from: email.getFrom(),
    to: email.getTo(),
    subject: 'Sending Email using Node.js',
    text: 'That was easy!'
  }

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}


function writeEmailToDatabase (email) {
    historyCollection.insert(email.toJson())
}