const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

//necessary middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.otsqa.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const componentCollection = client
      .db("computerComponent")
      .collection("component");
    const newOrderCollection = client
      .db("computerComponent")
      .collection("newOrder");
    const userCollection = client
      .db("computerComponent")
      .collection("user");

    app.get("/component", async (req, res) => {
      const query = {};
      const result = await componentCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/users',async(req,res)=>{
      const user = req.body;
      // const email = req.query.email;
      const query = {
        email:user.email
      };
      const users = {
        email:user.email,
        name:user.name,
        phone:user.phone
      }
      const exists = await userCollection.findOne(query);
      if(exists){
        return res.send({ success: false, user: exists });
      }
      else{
        const result = await userCollection.insertOne(users);
        return res.send({ success: true, result });
      } 
      
    });

    app.get('/users',async(req,res)=>{
      const result = await userCollection.find().toArray();
      res.send(result); 
    });


    app.put('/user',async(req,res)=>{
      const user = req.body;
      const filter = {email:user.email};
      const options = {upsert:true};
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({success:result});
    });


    app.get('/user',async(req,res)=>{
      const email = req.query.email;
      const query = {email:email};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    })

   
    app.get('/purchase',async(req,res)=>{
      const email = req.query.email;
      const filter = {email:email};
      const result = await newOrderCollection.find(filter).toArray();
      res.send(result);
    })

    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await componentCollection.findOne(query);
      res.send(result);
    });

    app.post("/purchase", async (req, res) => {
        const myOrder = req.body;
        const result = await newOrderCollection.insertOne(myOrder);
        res.send({success:result});
      });

    app.put("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const updateQuantity = req.body;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          available_quantity: updateQuantity.available_quantity,
        },
      };
      const result = await componentCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send({success:result});
    });

    app.delete('/purchase/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id:ObjectId(id)};
      const result = await newOrderCollection.deleteOne(query);
      res.send(result);
    })
    
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Computer Component server is running on UI");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
