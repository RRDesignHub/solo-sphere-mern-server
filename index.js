const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 9000
const app = express()

app.use(cors({
  origin: ["http://localhost:5173"],
  credentials:true
}))
app.use(express.json())
app.use(cookieParser());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u6vhn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

const verifyToken = (req, res, next) =>{
  const token = req.cookies?.token;

  if(!token){
    return res.status(401).send({message: "Unauthorised access!!!"})
  }
  jwt.verify(token, process.env.SECRET_KEY, (error, decoded) =>{
    if(error){
      return res.status(401).send({message: "Unauthorised access!!!"})
    }
    req.user = decoded;
  })
  next();
}

async function run() {
  try {
    await client.connect();
    const jobCollection = client.db('soloDB').collection('jobs');
    const bidCollection = client.db('soloDB').collection('bids');


    // jwt web token generate:
    app.post('/jwt', async(req, res) =>{
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_KEY, {expiresIn: "30d"})
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? 'none' : 'strict',
        })
        .send({message:true});
    })


    // clear cookie from browser:
    app.get('/logoutJWT', async(req, res) =>{
      res.clearCookie('token',{
        maxAge: 0,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? 'none' : 'strict',
      })
      .send({message:true})
    })

    // get all jobs from db
    app.get('/jobs', async(req, res) =>{
      const result = await jobCollection.find().toArray();
      res.send(result);
    })

    // get all jobs from db
    app.get('/allJobs', async(req, res) =>{
      const filter = req.query.filterByCategory;
      const search = req.query.search;
      const sort = req.query.sort;
      let option ={}
      if (sort){
        option = {sort: {deadline: sort == 'asc' ? 1 : -1}}
      }
      let query = {
        jobTitle: {$regex: search, $options: "i"}
      };
      if(filter){
        query.jobCategory = filter;
      }
      const result = await jobCollection.find(query, option).toArray();
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

    // save bids to db
    app.post('/addBid', async(req, res) =>{
      const newBid = req.body;

      // check if a user applied for the job before:
      const query = {bidderEmail: newBid?.bidderEmail, jobId: newBid?.jobId}
      const alreadyApplied = await bidCollection.findOne(query)

      if (alreadyApplied) {
        return res.status(400).json({ message: "You already applied for the job!!!" });
      }
     
      const result = await bidCollection.insertOne(newBid);

      // increase bid for new bid for job
      const id = newBid?.jobId;
      const filter = {_id: new ObjectId(id)};
      const update = {
        $inc: {bid_count: 1}
      }
      const updateBidCount = await jobCollection.updateOne(filter, update);
      res.send(result);
    })

    
     // get all bids for specipic bidder from db:
     app.get('/myBids/:email', async(req, res) =>{
      const queryEmail = req.params.email;
      const query = {bidderEmail : queryEmail};
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    })

    // get all bid request for specipic buyer from db:
    app.get('/bidRequest/:email', verifyToken, async(req, res) =>{
      const decodedEmail = req?.user?.email;
      const queryEmail = req.params.email;
      if(decodedEmail !== queryEmail){
        return res.status(401).send({message:"Unauthorosied Access!"})
      }

      const query = {buyerEmail : queryEmail};
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    })

    // update status for bid request in db:
    app.patch('/bidStatusUpdate/:id', async(req, res) =>{
      const id = req.params.id;
      const status = req.body.updatedStatus;
      const filter = {_id: new ObjectId(id)}
      const updated = {
        $set: {status}
      } 
      const result = await bidCollection.updateOne(filter, updated)
      res.send(result)
    })


  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
