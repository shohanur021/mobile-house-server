const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const admin = require('firebase-admin');
require('dotenv').config()

const port = 4444
const ObjectId = require('mongodb').ObjectId;
const app = express() 
app.use(bodyParser.json())
app.use(cors())

var serviceAccount = require("./mobile-house-s-firebase-adminsdk-otcng-eaeac86529.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mobile-house-s.firebaseio.com"
});


const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zcosf.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

client.connect(err => {
  const productCollection = client.db("mobilehouse").collection("products");
  const orderCollection = client.db("mobilehouse").collection("orders");

  app.post('/db/addOrders', (req, res) => {
    const newOrder = req.body;
    orderCollection.insertOne(newOrder)
      .then(result => {
        res.send(result.insertedCount > 0)
      })
  })

  app.get('/db/order', (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith('Bearer ')) {
      const idToken = bearer.split(' ')[1];
      admin.auth().verifyIdToken(idToken)
        .then((decodedToken) => {
          let tokenEmail = decodedToken.email;
          let queryEmail = req.query.email;
          if (tokenEmail === queryEmail) {
            orderCollection.find({ email: req.query.email })
            .toArray((err, documents) => {
                res.send(documents)
              })
          }
          else {
            res.status(401).send('unauthorized access');
          }
        })
        .catch((error) => {
          res.status(401).send('unauthorized access');
        });
    }
    else {
      res.status(401).send('unauthorized access');
    }
  })

  app.get('/db/products', (req, res) => {
    productCollection.find({})
      .toArray((err, documents) => {
        res.send(documents);
      })
  })

  app.get('/db/product/:id', (req, res) => {
    productCollection.find({ _id: ObjectId(req.params.id) })
      .toArray((err, documents) => {
        res.send(documents);
      })
  })

  app.post('/db/addProduct', (req, res) => {
    const product = req.body;
    productCollection.insertOne(product)
      .then(result => {
        res.send(result.insertedCount > 0)
      })
  })

  app.delete(`/db/delete/:id`, (req, res) => {
    productCollection.deleteOne({ _id: ObjectId(req.params.id) })
      .then(result => {
        res.send(result.deletedCount > 0)
      })
  })

  app.patch('/db/update/:id', (req, res) => {
    productCollection.updateOne({ _id: ObjectId(req.params.id) },
      {
        $set: { price: req.body.updatedPrice }
      })
      .then(result => {
        res.send(result.modifiedCount > 0)
      })
  })

});


app.listen(process.env.PORT || port)