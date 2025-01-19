const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cckud.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        await client.connect();

        const medicineCollection = client.db('PharmaHub').collection('medicines');
        const userCollection = client.db('PharmaHub').collection('users');
        const cartCollection = client.db('PharmaHub').collection('carts');

        // ----Medicine APIs----

        // Get all medicines
        app.get('/medicines', async (req, res) => {
            const result = await medicineCollection.find().toArray();
            res.send(result);
        })


        // ----Users APIs----

        // Get all users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/users/:id/role', async (req, res) => {
            const { id } = req.params;
            const { role } = req.body;
            const result = await userCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role: role } }
            );
            res.send(result);
        });


        // ----Cart Related APIs----

        // Get All Carts
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })

        // Add Cart
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("PharmaHub is Running...");
})

app.listen(port, () => {
    console.log(`PharmaHub Server is Running on PORT ${port}`);
})