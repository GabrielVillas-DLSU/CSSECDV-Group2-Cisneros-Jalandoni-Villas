// after EDITING this code, restart server.js
// nodemon does not properly save here

const express = require("express")

const authorize = require("../controllers/authorize.js")

const controller = require("../controllers/controller.js")

const userController = require("../controllers/userController");
 


const app = express()

app.get("/404", controller.get404)

app.get("/500", controller.get500)

app.get("/", controller.getHome)

app.get("/home", controller.getHome)

app.get("/about-us", controller.getAboutUs)

app.get("/product", authorize.authorize(["buyer"]), controller.getProduct)

app.get("/get-product/:id", authorize.authorize(["buyer","editor"]), controller.fetchProduct)

app.get("/register", controller.getRegister)

app.get("/product-list", authorize.authorize(["buyer","editor"]), controller.getProductList);

app.get("/admin", authorize.authorize(["admin"]), controller.getAdmin);

app.get("/editproduct", authorize.authorize([ "editor"]), controller.getEdit);

app.get("/forgot-password", controller.getForgot);

app.get("/reset-password", (req, res, next) => {
    const userId = req.query.userId;

    if (userId) {
        // Allow access for reset link with userId (unauthenticated)
        return res.render("reset-password", {
            userId,
            securityVerified: true,
            messages: req.flash()
        });
    }

    // If no userId in query, require login and role
    authorize.authorize(["buyer", "editor", "admin"])(req, res, next);
}, controller.getReset);

app.get("/", (req, res) => {
    res.render("home", { user: req.session.user });
});

app.get("/login", (req, res) => {
    res.render("login", {
        messages: req.flash()
    });
});

app.get("/editproductlist", authorize.authorize(["editor"]), controller.getEditProductList);

app.get("/form", controller.getForm);

app.post("/send-form", controller.sendForm);

app.get("/logs", authorize.authorize(["admin"]), (req, res) => {
    res.sendFile("/path/to/security.log");
});

app.post("/update-product/:id", authorize.authorize(["editor"]), controller.updateProduct);

app.get("/add-product", authorize.authorize(["editor"]), controller.getAddProduct);
app.post("/add-product", authorize.authorize(["editor"]), controller.postAddProduct);

app.delete("/deleteproduct/:id", authorize.authorize(["editor"]), controller.deleteProduct);


app.get("/cashier", authorize.authorize(["cashier"]), controller.getSalesList);

app.get("/addsale", authorize.authorize(["cashier"]), controller.getAddSale);
app.post("/addsale", authorize.authorize(["cashier"]), controller.postAddSale);

app.delete("/deletesale/:id", authorize.authorize(["cashier"]), controller.deleteSale);

app.post("/update-sale/:id", authorize.authorize(["cashier"]), controller.updateSale);


/* Routes for expense */
app.get("/expense", authorize.authorize(["admin"]), controller.getExpensesList);
app.get("/addexpense", authorize.authorize(["admin"]), controller.getAddExpense);
app.post("/addexpense", authorize.authorize(["admin"]), controller.postAddExpense);
app.delete("/deleteexpense/:id", authorize.authorize(["admin"]), controller.deleteExpense);
app.post("/update-expense/:id", authorize.authorize(["admin"]), controller.updateExpense);


module.exports = app