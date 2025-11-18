const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  phone: { type: String },
  studentEmail: { type: String, required: true },
  parentEmail: { type: String },
  qrCodeData: { type: String } // dataURL for QR image
});

module.exports = mongoose.model("Student", studentSchema);
