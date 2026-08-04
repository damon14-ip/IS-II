const express = require("express");
const cors = require("cors");
const path = require("path"); // <-- NUEVO: Para manejar rutas de carpetas
require("dotenv").config();

const citasRoutes = require("./src/routes/citasRoutes");

const app = express();

app.use(cors());             
app.use(express.json());     

// ✅ NUEVO: Hacemos pública la carpeta 'uploads' para que Angular pueda ver las fotos del Voucher
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", citasRoutes);

app.get("/", (req, res) => res.send("✅ Backend Ceramic Dent OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));