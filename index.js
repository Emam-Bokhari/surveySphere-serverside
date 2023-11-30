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
  origin: ["https://surveyspehere.web.app"],
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
    const commentCollection = database.collection("comment")
    const userCollection = database.collection("user")
    const paymentCollection = database.collection("payment")
    const surveyVoteCollection = database.collection("surveyVote")
    const reportCollection = database.collection("report")


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
          secure: true,
          sameSite:"none"
        })
        .send({ success: true })
    })

    // get :: show survey data
    app.get("/api/v1/show-servey", async (req, res) => {
      const result = await surveyCollection.find().toArray()
      res.send(result)
    })

    // show  all survey
    app.get("/api/v1/show-all-surveys",async(req,res)=>{
      const result=await surveyCollection.find().toArray()
      res.send(result)
    })


     // show  data by user based
     app.get("/api/v1/show-survey-user-based",async(req,res)=>{
      let query={}

      if(req.query.surveyorEmail){
        query={email:req.query.surveyorEmail}
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

    // patch :: publish survey
    app.patch("/api/v1/publish-survey/:surveyId",async(req,res)=>{
      const surveyData=req.body 
      const surveyId=req.params.surveyId
      const query={_id:new ObjectId(surveyId)}
      // console.log(surveyData);
      // console.log(surveyId);
      const updateData={
        $set:{
          status:surveyData.status,
          feedback:surveyData.feedback
        }
      }
      const result=await surveyCollection.updateOne(query,updateData)
      res.send(result)
    })

    // get :: show report data
    app.get("/api/v1/show-report",async(req,res)=>{
      const result=await reportCollection.find().toArray()
      res.send(result)
    })

    

    // post :: creae report
    app.post("/api/v1/create-report",async(req,res)=>{
      
      const report=req.body 
      const result=await reportCollection.insertOne(report)
      res.send(result)
    })


     // update :: update survey data
     app.patch('/api/v1/:surveyId/update-survey',verifyToken,verifySurveyor,async(req,res)=>{
      const surveyData=req.body 
      const surveyId=req.params.surveyId
      const query={_id:new ObjectId(surveyId)}
      const updatedSurvey ={
        $set:{
          surveyorEmail:surveyData.surveyorEmail,
          surveyTitle:surveyData.surveyTitle,
          category:surveyData.category,
          date:surveyData.date,
          description:surveyData.description,
          question1:surveyData.question1,
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

    // get :: recent survey (for featured survey)
    app.get("/api/v1/recent-surveys", async (req, res) => {
      try {
        const recentSurveys = await surveyCollection.find().sort({ _id: -1 }).limit(6).toArray();
        res.send(recentSurveys);
      } catch (error) {
        console.error("Error fetching recent surveys:", error);
        res.status(500).send("Internal Server Error");
      }
    });


    // get :: survey details
    app.get("/api/v1/:surveyId/survey-details", async (req, res) => {
      const surveyId = req.params.surveyId
      const query = { _id: new ObjectId(surveyId) }
      const result = await surveyCollection.findOne(query)
      res.send(result)
    })

    // patch :: like count
    app.patch('/api/v1/survey/like/:id', async (req, res) => {
      try {
          const { id } = req.params;
  
          const query = { _id: new ObjectId(id) };
          const info = req.body;
          console.log(info)
          const updateDoc = {
              $inc: { likesCount: 1 },
              $push: {
                  // likesCount: info.likesCount + 1,
                  likerEmail: info.userEmail,
                  likerName: info.userName,
              },
          };
          console.log(updateDoc)
          const result = await surveyCollection.updateOne(query, updateDoc);
  
          if (result.modifiedCount === 1) {
              res.json({ success: true });
          } else {
              res.status(404).json({ success: false, error: 'Survey not found' });
          }
      } catch (error) {
          console.error(error);
          res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
  });

  // get :: survey vote
  app.get("/api/v1/show-survey-vote",async(req,res)=>{
    const result=await surveyVoteCollection.find().toArray()
    res.send(result)
  })

  // get :: total vote of survey
app.get("/api/v1/show-total-voted", async (req, res) => {
  try {
    const surveyId = req.query.surveyId;

    if (!surveyId) {
      res.status(400).send("Survey ID is required");
      return;
    }

    const result = await surveyVoteCollection.aggregate([
      {
        $match: { surveyId } // Match documents with the specified surveyId
      },
      {
        $group: {
          _id: null,
          totalVote: {
            $sum: { $cond: [{ $eq: ['$answer1', 'yes'] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    const vote = result.length > 0 ? result[0].totalVote : 0;
    res.send({ vote });
  } catch (error) {
    console.error("Error fetching total votes:", error);
    res.status(500).send("Internal Server Error");
  }
});

  

  // get :: admin stats
  app.get("/api/v1/admin-stats",async (req, res) => {
   const users= await userCollection.estimatedDocumentCount()
    const payments=await paymentCollection.estimatedDocumentCount()
      res.send({users,payments})

  });


  // post :: creae survey-vote
  app.post("/api/v1/create-surveyVote",async(req,res)=>{
    const surveyVote=req.body 
    console.log(surveyVote);
    const query={email:surveyVote.email}
    const existingUser=await surveyVoteCollection.findOne(query)
    if(existingUser){
      return res.send({message:"You are already voted this survey!"})
    }
    const result=await surveyVoteCollection.insertOne(surveyVote)
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

    // get :: all users data for pro user
    app.get("/api/v1/all-users-for-pro",async(req,res)=>{
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

    // get :: show payment history data 
    app.get("/api/v1/user-payment-history",verifyToken,verifyAdmin,async(req,res)=>{
      // console.log(req.user.email);
      const result=await paymentCollection.find().toArray()
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


app.get("/", (req, res) => {
  res.send('Server is running...');
})

app.listen(port, (req, res) => {
  console.log(`port${port}`);
})