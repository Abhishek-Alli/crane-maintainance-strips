const PDFDocument = require('pdfkit');

class PDFService {
  /**
   * Generate PDF report for inspection
   * @param {Object} inspection - Inspection data with values
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generateInspectionReport(inspection) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('Crane Maintenance Inspection Report', {
          align: 'center'
        });
        doc.moveDown();

        // Inspection Details Box
        doc.fontSize(12).font('Helvetica');
        const detailsY = doc.y;
        doc.rect(50, detailsY, 495, 120).stroke();

        doc.font('Helvetica-Bold').text('Inspection Details:', 60, detailsY + 10);
        doc.font('Helvetica');

        const leftCol = 60;
        const rightCol = 300;
        let currentY = detailsY + 30;

        doc.text(`Date:`, leftCol, currentY);
        doc.text(new Date(inspection.inspection_date).toLocaleDateString(), leftCol + 100, currentY);

        doc.text(`Shed:`, rightCol, currentY);
        doc.text(inspection.shed_name, rightCol + 100, currentY);

        currentY += 20;
        doc.text(`Crane No:`, leftCol, currentY);
        doc.text(inspection.crane_number, leftCol + 100, currentY);

        doc.text(`Recorded By:`, rightCol, currentY);
        doc.text(inspection.recorded_by, rightCol + 100, currentY);

        currentY += 20;
        doc.text(`Crane Status:`, leftCol, currentY);
        doc.font('Helvetica-Bold')
          .fillColor(inspection.crane_status === 'OK' ? 'green' : 'red')
          .text(inspection.crane_status, leftCol + 100, currentY)
          .fillColor('black')
          .font('Helvetica');

        if (inspection.maintenance_start_time || inspection.maintenance_stop_time) {
          currentY += 20;
          doc.text(`Maintenance Time:`, leftCol, currentY);
          const timeText = `${inspection.maintenance_start_time || 'N/A'} - ${inspection.maintenance_stop_time || 'N/A'}`;
          doc.text(timeText, leftCol + 100, currentY);
        }

        doc.moveDown(2);

        // Group values by section
        const sections = {};
        inspection.values.forEach((value) => {
          if (!sections[value.section_name]) {
            sections[value.section_name] = [];
          }
          sections[value.section_name].push(value);
        });

        // Render each section
        Object.keys(sections).forEach((sectionName) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          // Section Header
          doc.fontSize(14)
            .font('Helvetica-Bold')
            .fillColor('#2c3e50')
            .text(sectionName, { underline: true });
          doc.moveDown(0.5);

          // Section Items Table
          sections[sectionName].forEach((item) => {
            if (doc.y > 720) {
              doc.addPage();
            }

            const itemY = doc.y;
            const rowHeight = 25;

            // Draw row background for alerts
            if (item.is_alert) {
              doc.rect(50, itemY - 5, 495, rowHeight).fillAndStroke('#fff3cd', '#ffc107');
            }

            doc.fontSize(11).font('Helvetica');

            // Item Name
            doc.fillColor('black').text(item.item_name, 60, itemY, { width: 200, continued: false });

            // Selected Value
            doc.fillColor(item.is_alert ? '#dc3545' : '#28a745')
              .font('Helvetica-Bold')
              .text(item.selected_value, 270, itemY, { width: 150 });

            // Status
            if (item.is_alert) {
              doc.fillColor('#dc3545')
                .font('Helvetica-Bold')
                .text('ATTENTION REQUIRED', 430, itemY);
            }

            doc.fillColor('black').font('Helvetica');

            // Remarks if any
            if (item.remarks) {
              doc.fontSize(9).fillColor('#666').text(`Note: ${item.remarks}`, 60, itemY + 15, { width: 480 });
            }

            doc.moveDown(item.remarks ? 1.5 : 0.8);
          });

          doc.moveDown();
        });

        // General Remarks
        if (inspection.remarks) {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc.fontSize(12).font('Helvetica-Bold').text('General Remarks:');
          doc.fontSize(10).font('Helvetica').text(inspection.remarks, { width: 495 });
          doc.moveDown();
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.fontSize(8)
            .fillColor('#666')
            .text(
              `Generated on ${new Date().toLocaleString()} | Page ${i + 1} of ${pageCount}`,
              50,
              750,
              { align: 'center' }
            );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFService;
