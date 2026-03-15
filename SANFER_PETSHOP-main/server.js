/*
Use in the terminal when there is no node_modules folder:
    npm install
*/

const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT;
const hostname = process.env.HOSTNAME;
const flash = require('express-flash');
const express = require("express");
const exphbs = require("express-handlebars");
const routes = require("./routes/routes.js");
const db = require("./models/db.js");
const authRoutes = require("./routes/auth");
const app = express();
const session = require("express-session");

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true for HTTPS
}));

app.use(flash());

// Configure Handlebars
const hbs = exphbs.create({
    defaultLayout: "main",
    extname: ".hbs",
    helpers: {
        eq: function (a, b) {
            return a === b;
        },
        or: function (a, b) {
            return a || b;
        },
        ifeq: function (a, b, options) {
            if (a == b) {
                return options.fn(this);
            }
            return options.inverse(this);
        },
        // This gets the pictures object into an array
        getPicture: function (obj) {
            if (!obj || !obj.Picture) {
                // Handle the case where obj or obj.Picture is undefined
                console.error("Error: obj or obj.Picture is undefined in getPicture helper.");
                return []; // Return an empty array or some default value
            }
        
            var arr = [];
            for (var key in obj.Picture) {
                if (key != "CPicture") {
                    var newObj = { picture: obj.Picture[key], picType: key, id: obj._id };
                    arr.push(newObj);
                }
            }
        
            for (var pic in obj.Picture.CPicture) {
                var newObj = { picture: obj.Picture.CPicture[pic], picType: "CPicture", index: pic };
                arr.push(newObj);
            }
        
            return arr;
        },
        // This will only get one picture (this is static)
        getFocusedPicture: function (obj) {
            if (!obj || !obj.Picture) {
                console.error("Error: obj or obj.Picture is undefined in getFocusedPicture helper.");
                return ""; // Return an empty string or some default value
            }
        
            var arr = [];
            for (var key in obj.Picture) {
                var newObj = { picture: obj.Picture[key], picType: key };
                arr.push(newObj);
            }
        
            return arr[0].picture;
        },
        // Parse the price object into a readable one, depending on the size. NOTE: this is static
        getPrice: function (price) {
            if (!price) {
                console.error("Error: price is undefined in getPrice helper.");
                return "Price not available"; // Return a default message or value
            }
        
            var arr = [];
            for (var key in price) {
                var newObj = { size: key, price: price[key] };
                arr.push(newObj);
            }
        
            if (arr.length > 0) {
                return arr[0].price;
            } else {
                return "Price not available"; // Handle empty price object
            }
        },
        allProductsToArray: function (products) {
            var arr = [];

            for (var key in products) {
                arr.push(products[key]);
            }
            return arr;
        },
        getDisplayPicture: function (picture) {
            var arr = [];
            for (var key in picture) {
                arr.push(picture[key]);
            }

            return arr[0];
        },
        convertToML: function (size, unit) {
            if (unit == 'L') {
                return size * 1000;
            }

            return size;
        },
        urlToArray: function (url) {
            var arr = [];

            for (var key in url) {
                arr.push(url[key]);
            }

            return arr[0];
        },
        checkUrl: function (url) {
            if (url == null) {
                return false;
            }

            return true;
        },
        // Return true if the picture is not a customer review picture
        isCPicture: function (picType) {
            if (picType != "CPicture") {
                return true;
            }

            return false;
        },
        formatDate: function (date) {
            if (!date) return "N/A";

            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            };

            return new Date(date).toLocaleString('en-US', options);
        },

        availabilityClass: function (quantity) {
            if (quantity == 0) return 'out-of-stock';
            if (quantity < 10) return 'low-stock';
            return 'in-stock';
        },

        availabilityText: function (quantity) {
            if (quantity == 0) return 'Out of stock';
            if (quantity < 10) return 'Low stock';
            return 'In stock';
        },

        getField: function (obj, field) {
            return obj[field];
        }
    }
});

// view engine as hbs
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// body parser for req.body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// static files in public folder like html, css, js
app.use(express.static("public"));

app.use((err, req, res, next) => {
    if (err.code === 'ENOENT') {
        return res.status(404).render('404.hbs');
    }
    next(err);
});

// routes for the webpages
app.use("/", routes);
app.use("/auth", authRoutes);

app.get('/home', (req, res) => {
    res.render('home', { 
        user: req.session.user
    });
});

app.get('/products', async (req, res) => {
    try {
        const products = await db.getAllProducts();
        console.log("Products data:", products);
        res.render('products', {
            user: req.session.user,
            Products: products // Pass Products with uppercase "P"
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        res.render('products', { user: req.session.user, Products: [] });
    }
});

app.get('/about-us', (req, res) => {
    res.render('about-us', { user: req.session.user });
});

app.get('/protected', (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}, (req, res) => {
    res.send('This is a protected page.');
});

app.use(express.static("public"));

app.use((err, req, res, next) => {
    if (err.code === 'ENOENT') {
        return res.status(404).render('404.hbs');
    }
    next(err);
});

// Catch-all 404 for other routes
app.use(function (req, res) {
    res.status(404).render('404.hbs');
});



app.listen(port, function () {
    console.log("Server running at: ");
    console.log("PORT: " + port);
    console.log("http://" + hostname + ":" + port);
    console.log("http://127.0.0.1:10000/");
    db.connectToDB();
});


