const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
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
        const paymentCollection = client.db('PharmaHub').collection('payments');
        const sellerAdvertiseCollection = client.db('PharmaHub').collection('sellerAdvertise');

        // ----Medicine APIs----

        // Get all medicines
        app.get('/medicines', async (req, res) => {
            const result = await medicineCollection.find().toArray();
            res.send(result);
        })

        // Get Specific Medicine by ID
        app.get('/medicine/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await medicineCollection.findOne(query);
            res.send(result);
        })

        // Get Specific Seller Medicine
        app.get('/medicines/:email', async (req, res) => {
            const email = req.params.email;
            const query = { sellerEmail: email }
            const result = await medicineCollection.find(query).toArray();
            res.send(result);
        })

        // Add Medicine
        app.post('/medicines', async (req, res) => {
            const medicine = req.body;
            const result = await medicineCollection.insertOne(medicine);
            res.send(result)
        })

        // Update Specific Medicine
        app.patch('/medicines/:id', async (req, res) => {
            const { id } = req.params;
            const categoryInfo = req.body;

            const result = await medicineCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: categoryInfo }
            )
            res.send(result)
        })

        // Delete Specific medicine
        app.delete('/medicines/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await medicineCollection.deleteOne(query);
            res.send(result);
        })


        // ----Users APIs----

        // Get all users
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.get('/users/role/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query);
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

        // Delete Specific Cart 
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        })

        // Delete All Cart
        app.delete('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartCollection.deleteMany(query);
            res.send(result);
        })

        // Add Cart
        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem);
            res.send(result);
        })

        // Update cart item quantity and totalPrice
        app.put('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const { quantity, totalPrice } = req.body;

            const result = await cartCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { quantity: quantity, totalPrice: totalPrice } }
            );

            res.send(result);
        });


        // ----Advertise Related APIs----

        // Get All Advertise
        app.get('/all-advertise', async (req, res) => {
            const result = await sellerAdvertiseCollection.find().toArray();
            res.send(result);
        })

        // Get Specific Seller Advertise
        app.get('/seller-advertise', async (req, res) => {
            const sellerEmail = req.query.sellerEmail;
            const query = { sellerEmail: sellerEmail }
            const result = await sellerAdvertiseCollection.find(query).toArray();
            res.send(result);
        })

        // Added Advertise
        app.post('/seller-advertise', async (req, res) => {
            const advertise = req.body;
            const result = await sellerAdvertiseCollection.insertOne(advertise);
            res.send(result);
        })

        // Update Advertise
        app.patch('/all-advertise/:id', async (req, res) => {
            const { id } = req.params;
            const advertiseInfo = req.body;

            const result = await sellerAdvertiseCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: advertiseInfo }
            )
            res.send(result)
        })


        // ----Payment Related APIs----

        // payment intent
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

        // Payment save in the database
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            // Delete each item from the cart
            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            };
            const deleteResult = await cartCollection.deleteMany(query);

            res.send({ paymentResult, deleteResult })
        })

        // All Payments
        app.get('/payments', async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        })

        // Get Specific User All Payment History
        app.get('/payments/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        })

        // Get Specific Seller All Payment History
        app.get('/seller-pay-history/:email', async (req, res) => {

            const email = req.params.email;

            // Query to check if the sellerEmail array contains the given email
            const query = { sellerEmail: { $in: [email] } };

            // Fetch payment history for the seller
            const payments = await paymentCollection.find(query).toArray();

            // Response formatting
            const formattedPayments = payments.map(payment => ({
                transactionId: payment.transactionId,
                buyerEmail: payment.email,
                medicineName: payment.medicinesName,
                // cartIds: payment.cartIds,
                totalPrice: payment.price,
                status: payment.status,
            }));

            res.send(formattedPayments);
        });

        // Update Payment Status
        app.patch('/payments/:id', async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await paymentCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: status } }
            )
            res.send(result);
        })


        // ----Stats Related APIs----

        // Admin dashboard using aggregation
        app.get('/admin-stats', async (req, res) => {
            const result = await paymentCollection.aggregate([
                {
                    $facet: {
                        totalRevenue: [
                            { $group: { _id: null, totalAmount: { $sum: "$price" } } }
                        ],
                        paidTotal: [
                            { $match: { status: "Paid" } },
                            { $group: { _id: null, totalAmount: { $sum: "$price" } } }
                        ],
                        pendingTotal: [
                            { $match: { status: "Pending" } },
                            { $group: { _id: null, totalAmount: { $sum: "$price" } } }
                        ]
                    }
                }
            ]).toArray();

            res.send({
                totalRevenue: result[0].totalRevenue[0]?.totalAmount || 0,
                paidTotal: result[0].paidTotal[0]?.totalAmount || 0,
                pendingTotal: result[0].pendingTotal[0]?.totalAmount || 0,
            });
        });

        // Seller dashboard using aggregation
        app.get('/seller-stats', async (req, res) => {
            const sellerEmail = req.query.sellerEmail;


            const result = await paymentCollection.aggregate([
                {
                    $match: { sellerEmail: sellerEmail }
                },
                {
                    $facet: {
                        totalRevenue: [
                            { $group: { _id: null, totalAmount: { $sum: "$price" } } }
                        ],
                        paidTotal: [
                            { $match: { status: "Paid" } },
                            { $group: { _id: null, totalAmount: { $sum: "$price" } } }
                        ],
                        pendingTotal: [
                            { $match: { status: "Pending" } },
                            { $group: { _id: null, totalAmount: { $sum: "$price" } } }
                        ]
                    }
                }
            ]).toArray();

            res.send({
                totalRevenue: result[0].totalRevenue[0]?.totalAmount || 0,
                paidTotal: result[0].paidTotal[0]?.totalAmount || 0,
                pendingTotal: result[0].pendingTotal[0]?.totalAmount || 0,
            });
        });


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