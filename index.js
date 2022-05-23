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

    app.get("/component", async (req, res) => {
      const query = {};
      const result = await componentCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/purchase/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await componentCollection.findOne(query);
      res.send(result);
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
