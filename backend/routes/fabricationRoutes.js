const express = require("express");
const db = require("../config/database");
const auth = require("../middleware/auth");

const { authenticate } = auth;

const router = express.Router();
const PDFDocument = require("pdfkit");
// const express = require("express");
// const db = require("../config/database");
// const auth = require("../middleware/auth");
// const PDFDocument = require("pdfkit");   // ✅ ADD THIS

// const { authenticate } = auth;



/* Get Sheets */
router.get("/fabrication-sheets", authenticate, async (req, res) => {

  try {
    const result = await db.query(
      "SELECT * FROM fabrication_sheets ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* Add Fabrication Report */
router.post("/fabrication-report", authenticate, async (req, res) => {
  const {
    report_date,
    location,
    work_description,
    contractor_name,
    work_given,
    status,
    instructed_by,
    note
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO fabrication_reports
      (report_date, location, work_description,
       contractor_name, work_given, status,
       instructed_by, note, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        report_date,
        location,
        work_description,
        contractor_name,
        work_given,
        status,
        instructed_by,
        note,
        req.user.id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fabrication Insert Error:", err);
    res.status(500).json({ error: err.message });
  }
});



router.get("/fabrication-report", authenticate, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM fabrication_reports ORDER BY report_date DESC"
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.get("/fabrication-report/pdf", authenticate, async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    let condition = "";
    let values = [];

    if (type === "daily") {
      condition = "WHERE report_date = CURRENT_DATE";
    }

    if (type === "weekly") {
      condition = "WHERE report_date >= CURRENT_DATE - INTERVAL '7 days'";
    }

    if (type === "monthly") {
      condition =
        "WHERE DATE_TRUNC('month', report_date) = DATE_TRUNC('month', CURRENT_DATE)";
    }

    if (type === "yearly") {
      condition =
        "WHERE DATE_TRUNC('year', report_date) = DATE_TRUNC('year', CURRENT_DATE)";
    }

    if (type === "custom" && startDate && endDate) {
      condition = "WHERE report_date BETWEEN $1 AND $2";
      values = [startDate, endDate];
    }

    const result = await db.query(
      `SELECT * FROM fabrication_reports
       ${condition}
       ORDER BY report_date ASC`,
      values
    );

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      layout: "landscape",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Fabrication-Report.pdf"
    );

    doc.pipe(res);

    /* ================= HEADER ================= */

    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("SRJ STRIPS & PIPES", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(14)
      .font("Helvetica")
      .text("Fabrication Report", { align: "center" });

    doc.moveDown(2);

    if (!result.rows || result.rows.length === 0) {
      doc
        .fontSize(12)
        .text("No records found for selected period.", { align: "center" });
      doc.end();
      return;
    }

    /* ================= TABLE CONFIG ================= */

    const startX = 40;
    let y = doc.y;

    const colWidths = [80, 120, 220, 130, 100, 100, 120, 160];

    const headers = [
      "Date",
      "Location",
      "Work Details",
      "Contractor",
      "Work Given",
      "Status",
      "Instructed By",
      "Note",
    ];

    /* ================= HEADER ROW ================= */

    headers.forEach((header, i) => {
      const x =
        startX +
        colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);

      doc
        .rect(x, y, colWidths[i], 30)
        .fillAndStroke("#FFF59D", "black"); // yellow bg

      doc
        .fillColor("black")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(header, x + 5, y + 8, {
          width: colWidths[i] - 10,
          align: "left",
        });
    });

    y += 30;

    /* ================= DATA ROWS ================= */

    result.rows.forEach((row) => {
      const rowData = [
        new Date(row.report_date).toISOString().split("T")[0],
        row.location || "",
        row.work_description || "",
        row.contractor_name || "",
        row.work_given || "",
        row.status || "",
        row.instructed_by || "",
        row.note || "",
      ];

      // calculate dynamic row height
      let rowHeight = 0;

      rowData.forEach((cell, i) => {
        const height = doc.heightOfString(cell.toString(), {
          width: colWidths[i] - 10,
        });
        rowHeight = Math.max(rowHeight, height);
      });

      rowHeight += 10;

      // page break check
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 50;
      }

      rowData.forEach((cell, i) => {
        const x =
          startX +
          colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);

        doc.rect(x, y, colWidths[i], rowHeight).stroke();

        doc
          .font("Helvetica")
          .fontSize(9)
          .text(cell.toString(), x + 5, y + 5, {
            width: colWidths[i] - 10,
            align: "left",
          });
      });

      y += rowHeight;
    });

    doc.end();
  } catch (err) {
    console.error("PDF Error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
