const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
require("dotenv").config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 3000
const app = express()

// middleware
app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}))
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
    const paymentCollection = database.collection("payment")


    // create middleware

    // verify token
    const verifyToken = async (req, res, next) => {
      const token = req.cookies?.token
      // console.log(token,'aita token');
      if (!token) {
        return res.status(401).send({ message: 'unathorized', status: 401 })
      }
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unathorized' })
        }
        req.user = decoded
        next()
      })

    }
   

    // verify admin (check database in the role admin)
    const verifyAdmin=async(req,res,next)=>{
      const email=req.user.email 
      const query={email:email}
      const user=await userCollection.findOne(query)
      const isAdmin=user?.role==='admin'
      if(!isAdmin){
        return res.status(403).send({message:'forbidden access'})
      }
      // console.log(req.user.email,'check');
      next()
    }

    // verify surveyor (check database in the role surveyor)
    const verifySurveyor=async(req,res,next)=>{
      const email=req.user.email 
      console.log(email,'check surveyor');
      const query={email:email}
      const user=await userCollection.findOne(query)
      const isSurveyor=user?.role==='surveyor'
      if(!isSurveyor){
        return res.status(403).send({message:'forbidden access'})
      }
      console.log(req.user.email,'check surveyor');
      next()
    }

    // jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      // console.log(token);
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false
        })
        .send({ success: true })
    })

    // get :: show survey data
    app.get("/api/v1/show-servey", async (req, res) => {
      const result = await surveyCollection.find().toArray()
      res.send(result)
    })



     // show  data by user based
     app.get("/api/v1/show-survey-user-based",async(req,res)=>{
      let query={}

      if(req.query.email){
        query={email:req.query.email}
      }
      
      const result=await surveyCollection.find(query).toArray()
      res.send(result)
    })

    // post :: create survey
    app.post("/api/v1/create-survey", async (req, res) => {
      const survey = req.body
      

      console.log(survey.email,'survey email');

      const result = await surveyCollection.insertOne(survey)
      res.send(result)
    })


     // update :: update survey data
     app.patch('/api/v1/:surveyId/update-survey',verifyToken,verifySurveyor,async(req,res)=>{
      const surveyData=req.body 
      const surveyId=req.params.surveyId
      const query={_id:new ObjectId(surveyId)}
      const updatedSurvey ={
        $set:{
          surveyTitle:surveyData.surveyTitle,
          category:surveyData.category,
          date:surveyData.date,
          description:surveyData.description,
          question1:surveyData.question1,
          question2:surveyData.question2,
          question3:surveyData.question3,
          question4:surveyData.question4,
          question5:surveyData.question5,
        }
      }
      const result=await surveyCollection.updateOne(query,updatedSurvey)
      res.send(result)
    
    })

     // delete :: delete survey
     app.delete('/api/v1/:surveyId/delete-survey',verifyToken,verifySurveyor,async(req,res)=>{
      const surveyId=req.params.surveyId 
      const query={_id:new ObjectId(surveyId)}
      const result=await surveyCollection.deleteOne(query)
      res.send(result)
    })

    // get :: survey details (aita just manage survey te use kora hoise surveyr data gula get korar jonno)
    app.get("/api/v1/:surveyId/secure-surveys", async (req, res) => {
      const surveyId = req.params.surveyId
      const query = { _id: new ObjectId(surveyId) }
      const result = await surveyCollection.findOne(query)
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
      // console.log(surveyLike);
      const result = await likeCollection.insertOne(surveyLike)
      res.send(result)
    })


    // get :: show comment
    app.get("/api/v1/show-comment", async (req, res) => {
      let query = {}
      if (req.query.commentId) {
        query = { commentId: req.query.commentId }
      }
      const result = await commentCollection.find(query).toArray()
      res.send(result)
    })


    // post :: create comment 
    app.post("/api/v1/comment", async (req, res) => {
      const comment = req.body
      // console.log(comment);
      const result = await commentCollection.insertOne(comment)
      res.send(result)
    })

    // get :: all users data
    app.get("/api/v1/all-users",verifyToken,verifyAdmin,async(req,res)=>{
      const result=await userCollection.find().toArray()
      res.send(result)
    })



    // post :: user data
    app.post("/api/v1/users", async (req, res) => {
      const user = req.body
      const query = { email: user.email }

      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }

      const result = await userCollection.insertOne(user)
      res.send(result)
    })


    // check admin
    app.get("/api/v1/check-admin", verifyToken, async (req, res) => {

      // console.log("Request user email:", req.user.email);
      
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden' });
      }
      
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      // console.log(" email:", req.query.email);
    
      const user = await userCollection.find(query).toArray();
      // console.log("User found:", user);
    
      let admin = false;
      if (user.length > 0) {
        admin = user[0]?.role === 'admin';
      }
    
      // console.log("Is admin:", admin);
      res.send({ admin });
    });


     // check surveyor
     app.get("/api/v1/check-surveyor", verifyToken, async (req, res) => {

      // console.log("Request user email:", req.user.email);
      
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden' });
      }
      
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
      // console.log(" email:", req.query.email);
    
      const user = await userCollection.find(query).toArray();
      // console.log("User found:", user);
    
      let surveyor = false;
      if (user.length > 0) {
        surveyor = user[0]?.role === 'surveyor';
      }
    
      // console.log("Is surveyor:", surveyor);
      res.send({ surveyor });
    });


    // patch :: make admin
    app.patch("/api/v1/create-admin/:userId",verifyToken,verifyAdmin,async(req,res)=>{
      const userId=req.params.userId 
      const query={_id:new ObjectId(userId)}
      const updatedDoc={
        $set:{
          role:"admin"
        }
      }
      const result=await userCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

     // patch :: make surveyor
     app.patch("/api/v1/create-surveyor/:userId",verifyToken,verifyAdmin,async(req,res)=>{
      const userId=req.params.userId 
      const query={_id:new ObjectId(userId)}
      const updatedDoc={
        $set:{
          role:"surveyor"
        }
      }
      const result=await userCollection.updateOne(query,updatedDoc)
      res.send(result)
    })


    // delete :: delete usesr
    app.delete("/api/v1/:userId/deleteUser",verifyToken,verifyAdmin,async(req,res)=>{
      const userId=req.params.userId
      const query={_id:new ObjectId(userId)}
      const result=await userCollection.deleteOne(query)
      res.send(result)
    })

    // post :: payment gateway
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    //  post :: payments and user data
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      // console.log(payment);
      const result = await paymentCollection.insertOne(payment);
      // console.log(payment.email);
      const userEmail=payment.email
      // console.log(userEmail,'ja payment korse tar email');

      // update user role
      const updateUserRole=await userCollection.updateOne(
        {email:userEmail},
        {$set:{role:'prouser'}}
      )

     

      res.send({result,updateUserRole});
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