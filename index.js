const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qhhqtot.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {
        const productsCollection = client.db('oldGolden').collection('products');


        const categoriesProductCollection = client.db('oldGolden').collection('categoriesProduct');

        const productCollection = client.db('oldGolden').collection('product');

        const advertiseCollection = client.db('oldGolden').collection('advertise');


        const usersCollection = client.db('oldGolden').collection('users');

        const bookingsCollection = client.db('oldGolden').collection('bookings');

        const paymentsCollection = client.db('oldGolden').collection('payments');




        // JWT 
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });



        // 2ND TRY CATEGORY PRODUCT 
        app.get('/categories', async (req, res) => {
            const query = {}
            const cursor = categoriesProductCollection.find(query);

            const categories = await cursor.toArray();
            res.send(categories);
        });



        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const products = await categoriesProductCollection.findOne(query);
            res.send(products);
        });


        // ORDERS POST 
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const query = {
                email: booking.email,
                productName: booking.productName
            }

            const alreadyBooked = await bookingsCollection.find(query).toArray();

            // if (alreadyBooked.length) {
            //     const message = `You already have a Order on ${booking.appointmentDate}`
            //     return res.send({ acknowledged: false, message })
            // }

            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });


        app.get('/myorders', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }

            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });


        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await bookingsCollection.findOne(query);
            res.send(order);
        })


        // PAYMENT 
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });


        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })

        // ALL USERS 
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });


        //GET ALL SELLERS 
        app.get('/allsellers', verifyJWT, async (req, res) => {
            let query = {};
            if (req.query.role === "Seller") {
                query = {
                    role: req.query.role
                }
            }
            const cursor = usersCollection.find(query);
            const allSeller = await cursor.toArray();
            res.send(allSeller);
        });


        // GET ALL BUYER 
        app.get('/dashboard/allbuyers', verifyJWT, async (req, res) => {
            let query = {};
            if (req.query.role === "Buyer") {
                query = {
                    role: req.query.role
                }
            }
            const cursor = usersCollection.find(query);
            const allBuyer = await cursor.toArray();
            res.send(allBuyer);
        });

        // check buyer 
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' });
        })

        // check Seller 
        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })

        // check admin 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' });
        })


        // Add Product 
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product)
            res.send(result);
        })



        // GET MY PRODUCTS 
        app.get('/myproducts', async (req, res) => {
            let query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = productCollection.find(query);
            const product = await cursor.toArray();
            res.send(product);
        });



        // GET ALL PRODUCTS IN CATEGORY PAGE 
        app.get('/allproducts', async (req, res) => {
            let query = {};
            if (req.query.categoryName) {
                query = {
                    categoryName: req.query.categoryName
                }
            }
            const cursor = productCollection.find(query);
            const allProduct = await cursor.toArray();
            res.send(allProduct);
        });



        // Users 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })




        // REPORT PRODUCT 
        app.put('/adertiseproduct/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    reported: 'yes'
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        // GET REPORTED PRODUCTS 
        app.get('/repotedproducts', async (req, res) => {
            let query = {};
            if (req.query.reported = "yes") {
                query = {
                    reported: req.query.reported
                }
            }
            const cursor = productCollection.find(query);
            const reportedproduct = await cursor.toArray();
            res.send(reportedproduct);
        });

        // EDIT PRODUCT STATUS 
        app.put('/dashboard/myproduct/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'sold'
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });


        // get ADVERTISE PRODUCT WITH YES 
        app.get('/advertiseproduct', verifyJWT, async (req, res) => {
            let query = {};
            if (req.query.advertise) {
                query = {
                    advertise: req.query.advertise
                }
            }
            const cursor = productCollection.find(query);
            const advertiseproduct = await cursor.toArray();
            res.send(advertiseproduct);
        });


        // 2Nd TRY ADVERtise 
        app.put('/dashboard/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: 'yes'
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });


        // GET ALL PRODUCT 
        app.get('/allproducts', async (req, res) => {
            const query = {};
            const allProducts = await productCollection.find(query).toArray();
            res.send(allProducts);
        });


        // GET ADVERTISE PRODUCT 
        app.get('/advertise', async (req, res) => {
            const query = {};
            const advertise = await advertiseCollection.find(query).toArray();
            res.send(advertise);
        });


        // VERIFIED SELLER 
        app.put('/dashboard/alluser/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    status: 'Verified'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });


        // DELETE SELLER 
        app.delete('/allseller/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // DELETE BUYERS 
        app.delete('/dashboard/allbuyers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })


        // DELETE PRODUCT 
        app.delete('/product/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })

    }
    finally {

    }

}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('server is running ')
})

app.listen(port, () => console.log(`server is running ${port}`))