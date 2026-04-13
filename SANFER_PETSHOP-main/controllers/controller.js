// after EDITING this code, restart server.js
// nodemon does not properly save here

const fs = require("fs");
const path = require("path");

const db = require("../models/db.js");
const userController = require("./userController");
const User = require("../models/user");
const logger = require("./logger");

const controller = {

    get404: function(req, res){
        res.render("404")
    },

    get500: function(req, res){
        res.render("500")
    },

    getHome: async function(req, res) {
    try {
        const stockSummary = await controller.getStockSummary();
        res.render("home", { stockSummary });
    } catch (err) {
        console.error("Error loading stock summary:", err);
        res.status(500).render("500");
    }
    },


    getAboutUs: function(req, res){
        res.render("aboutus", {
            layout: 'aboutus-layout'
        })
    },
    getForm: function(req, res){
        res.render("form", {
            layout: 'form-layout'
        })
    },
    getEdit: async (req, res) => {
        try {
            const productId = req.query.id;
            
            if (!productId) {
                return res.status(400).send("Product ID is required");
            }
    
            const product = await db.Product.findById(productId).lean();
            
            if (!product) {
                return res.status(404).render("404");
            }
            
            res.render("editproduct", { 
                product: product,
                layout: 'edit-layout'
            });
        } catch (error) {
            console.error("Error in getEdit:", error);
            res.status(500).render("500");
        }
    },

    updateProduct: async (req, res) => {
        try {
            const productId = req.params.id;
            const { productName, productPrice, quantity, expiryDate, productDescription, addproductDescription, source } = req.body;

            const product = await db.Product.findById(productId);

            if (!product) return res.status(404).send("Product not found");

            if (source === "inline") {

                // ✅ Validate required fields
                if (!productName || !productPrice || !quantity|| !expiryDate) {
                    return res.status(400).json({ error: "All fields are required." });
                }

                // Inline edit version
                product["Product Name"] = productName;
                product["Product Price"] = { "1 unit": Number(productPrice) };
                product.quantity = Number(quantity);
                product.expiryDate = expiryDate ? new Date(expiryDate) : null;
                const timestamp = new Date().toLocaleString();  // ISO format (like your other logs)

                // Example for delete
                logger.info({
                timestamp,
                level: "info",
                message: `UPDATE: User ${req.session.user.username} updated product '${product["Product Name"]}'`
                });
                await product.save();
                return res.redirect("/editproductlist");
            }

            // Full edit page version
            if (!productName || !productDescription || !addproductDescription) {
                req.flash('error', 'All fields are required.');
                return res.redirect(`/editproduct?id=${productId}`);
            }

            // Optional validation (lengths, etc.)

            product["Product Name"] = productName;
            product["Product Description"] = productDescription;
            product["Product Additional Info"] = addproductDescription;
            product.quantity = Number(quantity);
            product.expiryDate = expiryDate ? new Date(expiryDate) : null;
            const timestamp = new Date().toLocaleString();  // ISO format (like your other logs)

                // Example for delete
                logger.info({
                timestamp,
                level: "info",
                message: `UPDATE: User ${req.session.user.username} updated product '${product["Product Name"]}'`
                })
            await product.save();

            return res.redirect("/editproductlist");
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    

    getAdmin: async function (req, res) {
        try {
            const logFilePath = path.join(__dirname, "../security.log");

            fs.readFile(logFilePath, "utf8", (err, data) => {
                if (err) {
                    console.error("Error reading log file:", err);
                    return res.status(500).send("Error reading log file.");
                }

                // Split the log data into an array of lines
                const logEntries = data.split("\n").filter(entry => entry.trim() !== "");

                // Parse each log entry as JSON
                const parsedLogEntries = logEntries.map(entry => {
                    try {
                        return JSON.parse(entry);
                    } catch (error) {
                        console.error("Error parsing log entry:", error);
                        return null;
                    }
                }).filter(entry => entry !== null);

                // Render the admin page with the parsed log data
                res.render("admin", {
                    layout: 'form-layout',
                    logEntries: parsedLogEntries,
                });
            });

        } catch (error) {
            console.error("Error fetching log data:", error);
            res.status(500).send("Error fetching log data.");
        }
    },

    getRegister: function(req, res){
        res.render("register", {
            layout: 'form-layout',
            messages: req.flash()
        })        
    },

    getForgot: async function(req, res){
        try {
            res.render("forgot-password", { 
                messages: req.flash() 
            });
        } catch (error) {
            console.error(error);
            res.status(500).render('500');
        }       
    },

    getReset: async function(req, res){
        try {
            const userId = req.query.userId || req.session.userId;
                if (!userId) {
                    return res.status(400).send("User ID is required.");
                }
                
                // Assuming you're fetching user details based on the userId
                const user = await User.findById(userId);

                if (!user) {
                    return res.status(404).send("User not found.");
                }

                // Proceed with rendering the reset password page
                res.render("reset-password", { 
                    userId: user._id, 
                    securityQuestion: user.securityQuestion 
                });
        } catch (error) {
            console.error(error);
            res.status(500).render('500');
        }       
    },

    sendForm: function(req, res){

        const toSend = JSON.stringify(req.body)

        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept' : 'application/json'
            },
            body: toSend
        })
        .then(async (resp) => {
            let j = await resp.json();
            if (resp.status == 200){
                // Go to new page
                res.render('form-result',{
                    result: true,
                    layout: 'form-layout'
                })
            }
            else{
                res.render('form-result', {
                    layout: 'form-layout', 
                    result: false
                })
            }
        })
        .catch(error=>{
            res.render('form-result', {
                layout: 'form-layout', 
                result: false
            })
        })

    },
    getEditProductList: async function (req, res) {
        try {
            const products = await db.getAllProducts();

            if ("q" in req.query && req.query.q) {
                const q = req.query.q.toLowerCase();

                const searched_products = products.filter(prod => {
                    const name = (prod["Product Name"] || "").toLowerCase();
                    const desc = (prod["Product Description"] || "").toLowerCase();
                    const keywords = Array.isArray(prod["Keywords"])
                        ? prod["Keywords"].some(kw => kw.toLowerCase().includes(q))
                        : false;
                    return name.includes(q) || desc.includes(q) || keywords;
                });

                return res.render("editproductlist", {
                    Products: searched_products,
                });
            }

            res.render("editproductlist", {
                Products: products,
            });
        } catch (error) {
            console.error("Error in getEditProductList:", error);
            res.status(500).render("500");
        }
    },

    getProductList: async function (req, res) {
        try {
            const products = await db.getAllProducts();

            if ("q" in req.query && req.query.q) {
                const q = req.query.q.toLowerCase();

                const searched_products = products.filter(prod => {
                    const name = (prod["Product Name"] || "").toLowerCase();
                    const desc = (prod["Product Description"] || "").toLowerCase();
                    const type = (prod["Product Type"] || "").toLowerCase();
                    const keywords = Array.isArray(prod["Keywords"])
                        ? prod["Keywords"].map(k => k.toLowerCase())
                        : [];

                    return name.includes(q) || desc.includes(q) || keywords.includes(q) || type === q;
                });

                return res.render("productlist", {
                    Products: searched_products,
                });
            }

            res.render("productlist", {
                Products: products,
            });
        } catch (error) {
            console.error("Error in getProductList:", error);
            res.status(500).render("500");
        }
    },
 

      // This has been set to the first product. Change it when we are ready. (YES THIS IS SIMILAR TO THE BOTTOM OK)
    getProduct: async function (req, res){
        const product = await db.getProduct(req.query.id);
        res.render("product", {
            Product: product[0],
            layout: 'product-layout'
        });
    }, 
    fetchProduct: async function(req,res){

        const product = await db.getProduct(req.params.id);
        res.send(product);
    },


    getAddProduct: function (req, res) {
    res.render("addproduct", {
        layout: 'edit-layout',
        messages: req.flash()
    });
    },

    postAddProduct: async function (req, res) {
        try {
            const { productName, productPrice, quantity, expiryDate } = req.body;

            // ✅ Check if a product with the same name already exists (case-insensitive)
            const existingProduct = await db.Product.findOne({
                "Product Name": { $regex: new RegExp(`^${productName}$`, 'i') }
            });

            if (existingProduct) {
                req.flash('error', 'A product with that name already exists.');
                return res.redirect("/add-product");
            }

            
            const newProduct = new db.Product({
                "Product Name": productName,
                "Product Price": { "1 unit": Number(productPrice) },
                quantity: Number(quantity),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                "Product Description": "",
                "Product Additional Info": "",
                Keywords: [],
                Picture: {},
                "Product Type": 0,
                "Product Size": {},
                URL: {}
            });

            await newProduct.save();
            req.flash('success', 'Product added successfully!');
            res.redirect("/editproductlist");
        } catch (err) {
            console.error("Error adding product:", err);
            req.flash('error', 'Failed to add product.');
            res.redirect("/add-product");
        }
    },


    deleteProduct: async function (req, res) {
        try {
            
            const product = await db.Product.findById(req.params.id);
            if (!product) {
                return res.status(404).send("Product not found");
            }

            const timestamp = new Date().toLocaleString();  // ISO format (like your other logs)

            // Example for delete
            logger.info({
            timestamp,
            level: "info",
            message: `DELETE: User ${req.session.user.username} deleted product '${product["Product Name"]}'`
            })
            
            await db.Product.findByIdAndDelete(req.params.id);

            res.sendStatus(200);
        } catch (error) {
            console.error("Error deleting product:", error);
            res.sendStatus(500);
        }
    }, 

    getStockSummary: async function () {
        const allProducts = await db.Product.find({});
        let summary = {
            inStock: 0,
            lowStock: 0,
            outOfStock: 0
        };

        allProducts.forEach(p => {
            const qty = p.quantity || 0;
            if (qty === 0) summary.outOfStock++;
            else if (qty < 10) summary.lowStock++;
            else summary.inStock++;
        });

        return summary;
    },

    getSalesList: async function (req, res) {
        try {
            const sales = await db.Sale.find({}).lean();

            // Optional search/filter
            if ("q" in req.query && req.query.q) {
                const q = req.query.q.toLowerCase();

                const filteredSales = sales.filter(sale =>
                    sale.productName.toLowerCase().includes(q) ||
                    sale.customerName.toLowerCase().includes(q) ||
                    sale.paymentMethod.toLowerCase().includes(q)
                );

                return res.render("cashier", {
                    Sales: filteredSales,
                    user: req.session.user,
                    messages: req.flash(),
                });
            }

            res.render("cashier", {
                Sales: sales,
                user: req.session.user,
                messages: req.flash(),
            });
        } catch (error) {
            console.error("Error in getSalesList:", error);
            res.status(500).render("500");
        }
    },

    getAddSale: function (req, res) {
    res.render("addsale", {
        messages: req.flash()
    });
    },

    postAddSale: async function (req, res) {
    try {
        const {productName, customerName,  unitPrice, date, quantity, paymentMethod } = req.body;

        const totalPrice = unitPrice * Number(quantity);

        const newSale = new db.Sale({
            productName,
            unitPrice: Number(unitPrice),
            quantity: Number(quantity),
            totalPrice,
            customerName,
            date: new Date(date),  // auto-capture current time
            paymentMethod
        });

        await newSale.save();
        req.flash("success", "Sale transaction added successfully!");
        res.redirect("/cashier");
    } catch (error) {
        console.error("Error adding sale:", error);
        req.flash("error", "Failed to add sale transaction.");
        res.redirect("/cashier");
    }
    },

    deleteSale: async function (req, res) {
    try {
        await db.Sale.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Sale deleted" });
    } catch (error) {
        console.error("Error deleting sale:", error);
        res.status(500).json({ error: "Failed to delete sale" });
    }
    },

    updateSale: async (req, res) => {
    try {
        const saleId = req.params.id;
        const { productName, customerName, unitPrice, quantity, date, paymentMethod, source } = req.body;

        const sale = await db.Sale.findById(saleId);
        if (!sale) return res.status(404).send("Sale not found");
        
        const totalPrice = unitPrice * Number(quantity);

        const timestamp = new Date().toLocaleString();

        // Inline edit
        if (source === "inline") {

           if (!productName || !customerName || !paymentMethod || !unitPrice || !quantity || !date) {
                return res.status(400).json({ error: "All fields are required." });
            }


            sale.productName = productName;
            sale.customerName = customerName;
            sale.unitPrice = Number(unitPrice);
            sale.quantity = Number(quantity);
            sale.totalPrice = totalPrice;
            sale.date = new Date(date)
            sale.paymentMethod = paymentMethod;


            logger.info({
                timestamp,
                level: "info",
                message: `UPDATE: User ${req.session.user.username} updated sale for '${sale.productName}'`
            });

            await sale.save();
            return res.redirect("/cashier");
        }

        // Full form edit
        if (!productName || !customerName || !paymentMethod) {
            req.flash('error', 'All fields are required.');
            return res.redirect(`/edit-sale?id=${saleId}`);
        }

        sale.productName = productName;
        sale.customerName = customerName;
        sale.unitPrice = unitPrice;
        sale.quantity = Number(quantity);
        sale.totalPrice = totalPrice;
        sale.date = date ? new Date(date) : null;
        sale.paymentMethod = paymentMethod;

        logger.info({
            timestamp,
            level: "info",
            message: `UPDATE: User ${req.session.user.username} updated sale for '${sale.productName}'`
        });

        await sale.save();
        return res.redirect("/cashier");
    } catch (error) {
        console.error("Error updating sale:", error);
        res.status(500).send("Internal Server Error");
    }
},

// This is for accounts not expenses
getExpensesList: async function (req, res) {
    try {
        // This gets the user from MongoDb
        const users = await db.getAllUsers();

        // This is for searching the account
        if ("q" in req.query && req.query.q) {
            const q = req.query.q.toLowerCase();

            const filteredUsers = users.filter(user =>
                (user.username || "").toLowerCase().includes(q) ||
                (user.role || "").toLowerCase().includes(q)
            );

            return res.render("expense", {
                Users: filteredUsers,
                user: req.session.user,
                messages: req.flash(),
            });
        }

        // Renders users
        res.render("expense", {
            Users: users,
            user: req.session.user,
            messages: req.flash(),
        });
        } catch (error) {
        console.error("Error in getExpensesList:", error);
        res.status(500).render("500");
        }
    },

    getAddExpense: function (req, res) {
        res.render("addexpense", {
            messages: req.flash()
        });
    },

    deleteExpense: async function (req, res) {
        try {
            await db.Expense.findByIdAndDelete(req.params.id);
            res.status(200).json({ message: "Expense deleted" });
        } catch (error) {
            console.error("Error deleting expense:", error);
            res.status(500).json({ error: "Failed to delete expense" });
        }
    },

    updateExpense: async (req, res) => {
        try {
            const expenseId = req.params.id;
            const { productName, description, unitPrice, quantity, date, source } = req.body;

            const expense = await db.Expense.findById(expenseId);
            if (!expense) return res.status(404).send("Expense not found");

            const totalPrice = unitPrice * Number(quantity);
            const timestamp = new Date().toLocaleString();

            // Inline edit
            if (source === "inline") {
                // This is to validate requred fields
                if (!productName || !description || !unitPrice || !quantity|| !date) {
                    return res.status(400).json({ error: "All fields are required." });
                }
                expense.productName = productName;
                expense.description = description;
                expense.unitPrice = Number(unitPrice);
                expense.quantity = Number(quantity);
                expense.totalPrice = totalPrice;
                expense.date = date ? new Date(date) : null;

                logger.info({
                    timestamp,
                    level: "info",
                    message: `UPDATE: User ${req.session.user.username} updated expense for '${expense.productName}'`
                });

                await expense.save();
                return res.redirect("/expense");
            }

            // Full form edit (if needed)
            if (!productName || !description) {
                req.flash('error', 'All fields are required.');
                return res.redirect(`/edit-expense?id=${expenseId}`);
            }

            expense.productName = productName;
            expense.description = description;
            expense.unitPrice = unitPrice;
            expense.quantity = Number(quantity);
            expense.totalPrice = totalPrice;
            expense.date = date ? new Date(date) : null;

            logger.info({
                timestamp,
                level: "info",
                message: `UPDATE: User ${req.session.user.username} updated expense for '${expense.productName}'`
            });

            await expense.save();
            return res.redirect("/expense");
        } catch (error) {
            console.error("Error updating expense:", error);
            res.status(500).send("Internal Server Error");
        }
    },

    postAddExpense: async function (req, res) {
    try {
        const { productName, description, unitPrice, quantity, date } = req.body;

        // --- Validation checks ---
        if (!productName || !description || !unitPrice || !quantity || !date) {
            req.flash("error", "All fields are required.");
            return res.redirect("/addexpense");
        }

        if (isNaN(unitPrice) || unitPrice <= 0) {
            req.flash("error", "Unit price must be a valid positive number.");
            return res.redirect("/addexpense");
        }

        if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(Number(quantity))) {
            req.flash("error", "Quantity must be a valid positive whole number.");
            return res.redirect("/addexpense");
        }

        const totalPrice = unitPrice * Number(quantity);

        const newExpense = new db.Expense({
            productName,
            description,
            unitPrice: Number(unitPrice),
            quantity: Number(quantity),
            totalPrice,
            date: new Date(date)
        });

        await newExpense.save();
        req.flash("success", "Expense added successfully!");
        res.redirect("/expense");

        } catch (error) {
            console.error("Error adding expense:", error);
            req.flash("error", "Failed to add expense.");
            res.redirect("/addexpense");
        }
    },
getEditUser: async function (req, res) {
    try {
        const user = await db.User.findById(req.params.id).lean();
        res.render("editUser", { user });
    } catch (err) {
        console.error(err);
        res.status(500).render("500");
    }
},
    updateUser: async function (req, res) {
    try {
        const { username, role } = req.body;

        await db.User.findByIdAndUpdate(req.params.id, {
            username,
            role
        });

        res.redirect("/expense");
    } catch (err) {
        console.error(err);
        res.status(500).render("500");
    }
},
deleteUser: async function (req, res) {
    try {
        await db.User.findByIdAndDelete(req.params.id);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
},

}



module.exports = controller