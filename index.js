const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
require("dotenv").config()
const port = process.env.PORT || 3000
const app = express()

// middleware
app.use(cors())
app.use(express.json())
app.use(cookieParser())

// surveySphere
// q8ZbhVnqLWqhm2QM



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USERS_DB}:${process.env.DB_PASS}@cluster0.kndeci6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    //  database collection
    const database = client.db("surveySphereDB")
    const surveyCollection = database.collection("survey")
    const likeCollection = database.collection("like")
    const commentCollection = database.collection("comment")
    const userCollection = database.collection("user")

    // get :: show survey data
    app.get("/api/v1/show-servey", async (req, res) => {
      const result = await surveyCollection.find().toArray()
      res.send(result)
    })

    // post :: create survey
    app.post("/api/v1/create-survey", async (req, res) => {
      const survey = req.body
      console.log(survey);
      const result = await surveyCollection.insertOne(survey)
      res.send(result)
    })


    // get :: survey details
    app.get("/api/v1/:surveyId/survey-details", async (req, res) => {
      const surveyId = req.params.surveyId
      const query = { _id: new ObjectId(surveyId) }
      const result = await surveyCollection.findOne(query)
      res.send(result)
    })


    // post :: survey like
    app.post("/api/v1/like-survey", async (req, res) => {
      const surveyLike = req.body
      console.log(surveyLike);
      const result = await likeCollection.insertOne(surveyLike)
      res.send(result)
    })


    // get :: show comment
    app.get("/api/v1/show-comment",async(req,res)=>{
      let query={}
      if(req.query.commentId){
        query={commentId:req.query.commentId}
      }
      const result=await commentCollection.find(query).toArray()
      res.send(result)
    })


    // post :: create comment 
    app.post("/api/v1/comment", async (req, res) => {
      const comment = req.body
      console.log(comment);
      const result = await commentCollection.insertOne(comment)
      res.send(result)
    })

    // post :: user data
    app.post("/api/v1/users",async(req,res)=>{
      const user=req.body 
      const query={email:user.email}

      const existingUser=await userCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists',insertedId:null})
      }

      const result=await userCollection.insertOne(user)
      res.send(result)
    })








    // Send a ping to confirm a successful connection
    client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/health", (req, res) => {
  res.send('Server is running...');
})

app.listen(port, (req, res) => {
  console.log(`port${port}`);
})