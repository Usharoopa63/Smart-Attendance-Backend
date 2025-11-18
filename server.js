// server.js - Backend entrypoint
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const adminRoutes = require("./routes/adminRoutes");

const sendEmail = require("./utils/sendEmail");
const Student = require("./models/Student");
const Attendance = require("./models/Attendance");  // FIXED: Correct case

const cron = require("node-cron");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ===============================
// CONNECT TO MONGODB
// ===============================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));


// ===============================
// EXPOSE API ROUTES
// ===============================

app.get("/", (req, res) => res.send("Smart Attendance Backend Running ✅"));

app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);  
app.use("/api/admin", adminRoutes);


// ===============================
// DAILY ABSENTEE EMAIL JOB (17:00)
// ===============================

async function sendAbsenteeEmails() {
  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const students = await Student.find({});
    const presentRecords = await Attendance.find({ date: { $gte: start, $lte: end } });

    const presentRolls = new Set(presentRecords.map(r => r.rollNo));
    const absentees = students.filter(s => !presentRolls.has(s.rollNo));

    const dateStr = start.toLocaleDateString();

    for (const a of absentees) {
      const subject = `Absence Alert — ${dateStr}`;
      const text = `Dear ${a.name},\n\nYou were marked ABSENT on ${dateStr}.`;
      const html = `<p>Dear ${a.name},</p><p>You were marked <strong>ABSENT</strong> on ${dateStr}.</p>`;

      try {
        if (a.studentEmail) await sendEmail(a.studentEmail, subject, text, html);
        if (a.parentEmail) await sendEmail(a.parentEmail, subject, text, html);
        console.log("📧 Email sent for:", a.rollNo);
      } catch (err) {
        console.error("❌ Email send failed for:", a.rollNo, err.message);
      }
    }

    console.log(`✔ Absentee email job completed. Total absentees: ${absentees.length}`);
  } catch (err) {
    console.error("❌ Absentee email job error:", err);
  }
}

// Schedule to run everyday at 17:00
cron.schedule("0 17 * * *", () => {
  console.log("⏰ Running scheduled absentee email job...");
  sendAbsenteeEmails();
});


// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
