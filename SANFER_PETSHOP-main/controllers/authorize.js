const logger = require("./logger"); // Adjust the path if needed

// 2.1.1. Require authentication for all pages and resources, except those specifically intended to
// be public
const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.status(401).redirect("/login");
        }

        if (!roles.includes(req.session.user.role)) {
            logger.warn(`Access control failure: User ${req.session.user?.username} attempted to access ${req.originalUrl}.`);
            return res.status(403).render("404");
        }

        next();
    };
};

module.exports = { authorize };
