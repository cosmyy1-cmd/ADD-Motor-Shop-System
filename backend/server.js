
const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./db");

const app = express();

const PORT = 3000;

/* =========================================
   MIDDLEWARE
========================================= */

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

/* =========================================
   FRONTEND
========================================= */

const frontendPath = path.join(__dirname, "../frontend");

app.use(
    "/frontend",
    express.static(frontendPath)
);

app.get("/", (req, res) => {
    res.sendFile(
        path.join(frontendPath, "index.html")
    );
});

/* =========================================
   CUSTOMER API ROUTES
========================================= */

// Database and system routes
app.use("/api", require("./routes/system"));

// Customer registration, login, and user information
app.use("/api", require("./routes/auth"));

// Customer motorcycle management
app.use("/api", require("./routes/motorcycles"));

// Services and products
app.use("/api", require("./routes/catalog"));

// Customer reservations and appointments
app.use("/api", require("./routes/reservations"));

/* =========================================
   ADMIN API ROUTES
========================================= */

const registerAdminRoutes = require("./routes/admin-routes");

registerAdminRoutes(app, db);

/* =========================================
   404 - API NOT FOUND
========================================= */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found."
    });
});

/* =========================================
   404 - PAGE NOT FOUND
========================================= */

app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Page Not Found</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 60px 20px;
                    background: #f5f6f8;
                    color: #222;
                }

                h1 {
                    font-size: 48px;
                    margin-bottom: 10px;
                }

                p {
                    color: #666;
                }
            </style>
        </head>

        <body>
            <h1>404</h1>
            <h2>Page Not Found</h2>
            <p>The page you are looking for does not exist.</p>
        </body>
        </html>
    `);
});

/* =========================================
   START SERVER
========================================= */

async function startServer() {
    try {
        await db.query("SELECT 1");

        console.log("Database connection successful.");

        app.listen(PORT, () => {
            console.log("");
            console.log("========================================");
            console.log("          ADD MOTOR SHOP SERVER");
            console.log("========================================");
            console.log("");

            console.log(
                `Server running at http://localhost:${PORT}`
            );

            console.log(
                `Customer frontend: http://localhost:${PORT}/frontend/`
            );

            console.log(
                `Admin frontend: http://localhost:${PORT}/frontend/admin/`
            );

            console.log(
                `Admin API: http://localhost:${PORT}/api/admin/`
            );

            console.log("");
        });

    } catch (error) {
        console.error(
            "Unable to connect to the database:",
            error
        );

        process.exit(1);
    }
}

startServer();
