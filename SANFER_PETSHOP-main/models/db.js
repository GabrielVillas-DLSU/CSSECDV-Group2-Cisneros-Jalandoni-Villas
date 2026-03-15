const mongoose = require("mongoose");
const { User, userSchema } = require("./user");

// Connect to database (LOCALLY)
function connectToDB() {
    mongoose.connect(process.env.LOCAL_DB_URL, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log("MongoDB connection successful!"))
        .catch(() => console.log("MongoDB connection failed!"));
}

// Define Product Schema 
const productSchema = new mongoose.Schema({
  "Product Name": { type: String, required: true },
  "Product Price": { type: Object, required: true },
  quantity: { type: Number, default: 0 }, // e.g., number of units, pieces, kg
  expiryDate: { type: Date, default: null } // store as an ISO Date object
});

// Create Product Model 
const Product = mongoose.model("Product", productSchema, "Products");

// Sale Schema
const saleSchema = new mongoose.Schema({
    productName: String,
    unitPrice: Number,      // New field
    quantity: Number,
    totalPrice: Number,     // New field = unitPrice × quantity
    customerName: String,
    date: Date,
    paymentMethod: String
});

const Sale = mongoose.model("Sale", saleSchema, "Sales");


/*Expense Schemas */
// Expense Schema
const expenseSchema = new mongoose.Schema({
    productName: String,
    unitPrice: Number,      // New field
    quantity: Number,
    totalPrice: Number,     // New field = unitPrice × quantity
    description: String,
    date: Date,
});

const Expense = mongoose.model("Expense", expenseSchema, "Expenses");


// Function to get all products 
async function getAllProducts() {
    return await Product.find({}).lean();
}

// Function to get a product by ID 
async function getProduct(id) {
    return await Product.find({ _id: id }).lean();
}

module.exports = {
    connectToDB,
    getAllProducts,
    getProduct,
    Product,
    User,
    Sale,
    Expense,
};
