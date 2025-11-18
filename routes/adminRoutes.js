const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const sendEmail = require("../utils/sendEmail");

// POST /api/admin/send-absentees
// Body: { secret: "<ADMIN_SECRET>" }
router.post("/send-absentees", async (req, res) => {
  try {
    const { secret } = req.body;
    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Build the absentee list for today
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0,0,0);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23,59,59);

    const students = await Student.find({});
    const presentRecords = await Attendance.find({ date: { $gte: start, $lte: end } });
    const presentRolls = new Set(presentRecords.map(r => r.rollNo));
    const absentees = students.filter(s => !presentRolls.has(s.rollNo));

    const dateStr = start.toLocaleDateString();

    for (const a of absentees) {
      const subject = `Absence Alert — ${dateStr}`;
      const text = `Dear ${a.name},\n\nYou were marked ABSENT on ${dateStr}.\nIf this is a mistake please contact your coordinator.\n\n- Smart Attendance System`;
      const html = `<p>Dear ${a.name},</p><p>You were marked <strong>ABSENT</strong> on ${dateStr}.</p><p>If this is a mistake please contact your coordinator.</p><p>- Smart Attendance System</p>`;
      try {
        if (a.studentEmail) await sendEmail(a.studentEmail, subject, text, html);
        if (a.parentEmail) await sendEmail(a.parentEmail, subject, text, html);
      } catch (err) {
        console.error("Error sending absentee mail:", err);
      }
    }

    res.json({ success: true, count: absentees.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
