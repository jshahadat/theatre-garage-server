const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config()
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


        const categoriesCollection = client.db('oldGolden').collection('categories');

        const productCollection = client.db('oldGolden').collection('product');

        const advertiseCollection = client.db('oldGolden').collection('advertise');


        const usersCollection = client.db('oldGolden').collection('users');




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


        // GET CATEGORY 
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });


        // GET CATEGORIES PRODUCT 
        app.get('/categories/product', async (req, res) => {

            let query = {};

            if (req.query.categoryName) {
                query = {
                    email: req.query.categoryName
                }
            }
            const cursor = productCollection.find(query);
            const categoryProduct = await cursor.toArray();
            res.send(categoryProduct);
        });




        // ALL USERS 
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });


        // ALL SELLERS 
        app.get('/allsellers', async (req, res) => {

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


        // Users 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })



        // EDIT STATUS 

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

        // ADVERTISE 
        // app.post('/product/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: ObjectId(id) };
        //     const result = await advertiseCollection.insertOne(query);
        //     res.send(result);
        // })


        // get ADVERTISE PRODUCTWITH YES 

        app.get('/advertiseproduct', async (req, res) => {

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


        // 1St try 
        app.post('/advertise', async (req, res) => {
            const advertise = req.body;
            console.log(advertise);
            const query = {
                name: advertise.name,
                email: advertise.email,
                location: advertise.location
            }

            const alreadyAdvertise = await advertiseCollection.find(query).toArray();

            if (alreadyAdvertise.length) {
                const message = `You already have Advertise your product on ${advertise.name}`
                return res.send({ acknowledged: false, message })
            }

            const result = await advertiseCollection.insertOne(advertise);
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


        app.delete('/product/:id', async (req, res) => {
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