const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u6vhn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    await client.connect();
    const jobCollection = client.db('soloDB').collection('jobs');

    // get all jobs from db
    app.get('/jobs', async(req, res) =>{
      const result = await jobCollection.find().toArray();
      res.send(result);
    })

    // save jobs to db
    app.post('/addJob', async(req, res) =>{
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    })


    // get specific user added jobs from db:
    app.get('/jobs/:email', async(req, res)=>{
      const queryEmail = req.params.email;
      const query = {'buyer.email': queryEmail};
      const result = await jobCollection.find(query).toArray();
      res.send(result);

    })


    // get single job by id from db:
    app.get('/job/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await jobCollection.findOne(query);
      res.send(result);
    })

    // save jobs to db
    app.put('/updateJob/:id', async(req, res) =>{
      const id = req.params.id;
      const updateJob = req.body;
      const query = {_id : new ObjectId(id)};
      const updated = {
        $set: updateJob,
      }
      const options = {upsert : true}
      const result = await jobCollection.updateOne(query, updated, options);
      res.send(result);
    })

    // delete a job from db:
    app.delete('/job/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    })



    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    // console.log(
    //   'Pinged your deployment. You successfully connected to MongoDB!'
    // )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))