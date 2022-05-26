const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
var jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//necessary middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.otsqa.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const componentCollection = client
      .db("computerComponent")
      .collection("component");
    const newOrderCollection = client
      .db("computerComponent")
      .collection("newOrder");
    const userCollection = client.db("computerComponent").collection("user");
    const reviewCollection = client.db("computerComponent").collection("review");
    const paymentCollection = client
      .db("componentPayment")
      .collection("payments");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "Forbidden access" });
      }
    };

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const item = req.body;
      const price = item.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await newOrderCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedOrder);
    });

    app.get("/component", async (req, res) => {
      const query = {};
      const result = await componentCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/component",verifyJWT,verifyAdmin, async(req,res)=>{
      const component = req.body;
      const result = await componentCollection.insertOne(component);
      res.send(result);
    });
    app.post("/review",verifyJWT, async(req,res)=>{
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get('/review',async(req,res)=>{
      const result = await reviewCollection.find().toArray();
      res.send(result);
    })

    app.put('/update/:id',verifyJWT,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const updateQuantity = req.body;
      const filter = {_id:ObjectId(id)};
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
      res.send(result);
    })

    app.post("/users", verifyJWT, async (req, res) => {
      const user = req.body;
      // const email = req.query.email;
      const query = {
        email: user.email,
      };
      const users = {
        email: user.email,
        name: user.name,
        phone: user.phone,
      };
      const exists = await userCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, user: exists });
      } else {
        const result = await userCollection.insertOne(users);
        return res.send({ success: true, result });
      }
    });

    app.get("/users", verifyJWT, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const name = user.name;
      const filter = { email: email,name:name };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "10d",
      });
      res.send({ result, token });
    });

    app.put("/user", verifyJWT, async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);

      res.send(result);
    });

    app.get("/user", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/order", verifyJWT, async (req, res) => {
      const result = await newOrderCollection.find().toArray();
      res.send(result);
    });

    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await newOrderCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/purchase", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await newOrderCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/purchase/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await componentCollection.findOne(query);
      res.send(result);
    });

    app.post("/purchase", verifyJWT, async (req, res) => {
      const myOrder = req.body;
      const result = await newOrderCollection.insertOne(myOrder);
      res.send({ success: result });
    });

    app.put("/purchase/:id", verifyJWT, async (req, res) => {
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
      res.send({ success: result });
    });

    app.delete("/purchase/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await newOrderCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await newOrderCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/user/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });
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
