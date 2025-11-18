const express = require("express");
const { generateQRCode } = require("../utils/qrGenerator");
const Student = require("../models/Student");
const router = express.Router();

// POST /api/students/register
router.post("/register", async (req, res) => {
  try {
    const { name, rollNo, phone, studentEmail, parentEmail } = req.body;

    if (!name || !rollNo || !studentEmail) {
      return res.status(400).json({ success: false, message: "Name, RollNo and Student Email are required" });
    }

    const existing = await Student.findOne({ rollNo });
    if (existing) {
      return res.status(400).json({ success: false, message: "Roll No already exists" });
    }

    const qrCodeData = await generateQRCode(rollNo);

    const student = new Student({ name, rollNo, phone, studentEmail, parentEmail, qrCodeData });
    await student.save();

    res.json({ success: true, message: "Student registered", qrCodeData });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
