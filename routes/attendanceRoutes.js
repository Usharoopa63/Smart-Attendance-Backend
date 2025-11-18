const express = require("express");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");
const XLSX = require("xlsx");
const router = express.Router();

// POST /api/attendance/mark
router.post("/mark", async (req, res) => {
  try {
    const { rollNo } = req.body;
    if (!rollNo)
      return res.status(400).json({ success: false, message: "rollNo required" });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const already = await Attendance.findOne({
      rollNo,
      date: { $gte: todayStart, $lte: todayEnd }
    });

    if (already) {
      return res.json({
        success: true,
        message: "Already marked present for today",
        record: already
      });
    }

    const rec = new Attendance({ rollNo, status: "Present" });
    await rec.save();

    const student = await Student.findOne({ rollNo });

    res.json({
      success: true,
      message: "Marked present",
      record: rec,
      student
    });

  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET all attendance
router.get("/", async (req, res) => {
  const records = await Attendance.find().sort({ date: -1 });
  res.json(records);
});

// GET attendance by rollno
router.get("/:rollNo", async (req, res) => {
  try {
    const { rollNo } = req.params;
    const records = await Attendance.find({ rollNo }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET by date
router.get("/date/:date", async (req, res) => {
  try {
    const dateStr = req.params.date;
    const d = new Date(dateStr);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));

    const records = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUMMARY
router.get("/summary", async (req, res) => {
  try {
    const summary = await Attendance.aggregate([
      { $group: { _id: "$rollNo", daysPresent: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CLEAN DUPLICATES
router.delete("/clean-duplicates", async (req, res) => {
  try {
    const duplicates = await Attendance.aggregate([
      {
        $group: {
          _id: {
            rollNo: "$rollNo",
            day: { $dayOfYear: "$date" },
            year: { $year: "$date" }
          },
          ids: { $push: "$_id" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]);

    let totalRemoved = 0;

    for (const doc of duplicates) {
      const idsToRemove = doc.ids.slice(1); // keep first
      const result = await Attendance.deleteMany({ _id: { $in: idsToRemove } });
      totalRemoved += result.deletedCount;
    }

    res.json({
      success: true,
      removed: totalRemoved,
      message: `Removed ${totalRemoved} duplicate entries`
    });

  } catch (err) {
    console.error("Clean duplicates error:", err);
    res.status(500).json({ success: false, message: "Server error cleaning duplicates" });
  }
});

// EXPORT ATTENDANCE AS EXCEL (WITH NAME)
router.get("/export/excel", async (req, res) => {
  try {
    const records = await Attendance.find().lean();
    const students = await Student.find().lean();

    const studentMap = {};
    students.forEach(s => {
      studentMap[s.rollNo] = s.name;
    });

    const data = records.map(r => ({
      Name: studentMap[r.rollNo] || "Unknown",
      RollNo: r.rollNo,
      Status: r.status,
      Date: new Date(r.date).toLocaleString()
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=attendance.xlsx");
    res.setHeader("Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);

  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({ success: false, message: "Error exporting Excel" });
  }
});

module.exports = router;
