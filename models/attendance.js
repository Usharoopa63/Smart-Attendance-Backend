const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  status: { type: String, default: "Present" },
  date: { type: Date, default: Date.now } // timestamp when marked
});

module.exports = mongoose.model("Attendance", attendanceSchema);
