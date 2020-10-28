const express = require('express')
const bodyParser = require('body-parser')

const app = express()
const APIBase = '/api/exercise/';

const cors = require('cors')
app.use(cors())

const mongoose = require('mongoose')
const mongooseOpts = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}
mongoose.connect(process.env.MONGODB_URI, mongooseOpts)

const User = mongoose.model("User", mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0
  },
  log: {
    type: [{
      description: {
        type: String,
        required: true
      },
      duration: {
        type: Number,
        required: true
      },
      date: {type: Date},
    }]
  }
}));

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (_, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get(APIBase + 'users', (req, res, next) => {
  User.find().select({_id: 1, username: 1}).exec((err, data) => {
    if (err) next({errors: {'users': {message: "Error getting user list"}}});
    res.json(data);
  });
});

app.post(APIBase + 'new-user', (req, res, next) => {
  User.findOne({username: req.body.username}, (err, data) => {
    if (err) return next(err)
    if (data !== null) return next({errors: {'new-user': {message: "Username already taken"}}})
    newUser = new User({username: req.body.username})
    newUser.save((err, data) => {
      if (err) return next({errors: {'new-user-save': {message: "Error saving user"}}})
      res.json({_id: data._id, username: data.username});
    });
  });
});

app.post(APIBase + 'add', (req, res, next) => {
  const log = {
    description: req.body.description,
    duration: req.body.duration,
  }
  if (req.body.date) log.date = new Date(req.body.date + ' ').toDateString()
  else log.date = new Date().toDateString();
  if (!req.body.userId) return next({errors: {'add': {message: "No UserID specified"}}})
  User.findOneAndUpdate(
    {_id: req.body.userId},
    {
      $push: {log: log},
      $inc: {count: 1},
    },
    {
      new: true,
      setDefaultsOnInsert: true,
      useFindAndModify: true,
    },
    (err, data) => {
      if (err) next(err);
      res.json({
        _id: data._id,
        username: data.username,
        date: log.date,
        duration: Number(log.duration),
        description: log.description,
      });
    });
});

app.get(APIBase + 'log', (req, res, next) => {
  User.findById(req.query.userId, (err, data) => {
    if (err) return next(err);
    if (req.query.from) data.log = data.log.filter(v =>
      v.date >= new Date(req.query.from))
    if (req.query.to) data.log = data.log.filter(v =>
      v.date <= new Date(req.query.to))
    if (req.query.limit) data.log = data.log.slice(0, req.query.limit)
    res.json(data)
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  console.log("Received err", err)
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
