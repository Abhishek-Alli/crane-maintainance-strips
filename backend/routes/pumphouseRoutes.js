const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const PDFDocument = require('pdfkit');

/* =========================================
   GET ALL LOCATIONS
========================================= */
router.get('/locations', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pumphouse_locations ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});


/* =========================================
   SAVE + GENERATE PDF
========================================= */
router.post('/readings-with-pdf', async (req, res) => {
  try {
    const { date, readings } = req.body;

    if (!date || !readings) {
      return res.status(400).json({ error: "Missing date or readings" });
    }

    /* ==============================
       SAVE TO DATABASE
    ============================== */
    for (const item of readings) {
      await pool.query(
        `
        INSERT INTO pumphouse_daily_records
        (record_date, location_id, tds, hardness, ph, temp)
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          date,
          item.location_id,
          item.tds,
          item.hardness,
          item.ph,
          item.temp
        ]
      );
    }

    /* ==============================
       CREATE PDF
    ============================== */
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=PUMP_HOUSE_${date}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // TITLE
    doc.fontSize(16)
       .text("PUMP HOUSE WATER PARAMETERS", { align: "center" });

    doc.moveDown();
    doc.fontSize(12).text(`Date: ${date}`);
    doc.moveDown(2);

    /* ==============================
       TABLE HEADER
    ============================== */
    const startX = 40;
    let y = doc.y;

    doc.fontSize(10).font("Helvetica-Bold");

    doc.text("Location", startX, y);
    doc.text("TDS", startX + 150, y);
    doc.text("Hardness", startX + 210, y);
    doc.text("PH", startX + 300, y);
    doc.text("Temp", startX + 350, y);

    doc.moveDown();

    /* ==============================
       TABLE DATA
    ============================== */
    doc.font("Helvetica");

    for (const item of readings) {

      const loc = await pool.query(
        "SELECT location_name FROM pumphouse_locations WHERE id = $1",
        [item.location_id]
      );

      const locationName = loc.rows[0]?.location_name || "-";

      y = doc.y;

      doc.text(locationName, startX, y);
      doc.text(item.tds ?? "-", startX + 150, y);
      doc.text(item.hardness ?? "-", startX + 210, y);
      doc.text(item.ph ?? "-", startX + 300, y);
      doc.text(item.temp ?? "-", startX + 350, y);

      doc.moveDown();
    }

    doc.end();

  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
