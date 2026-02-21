const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generatePrescriptionPDF(prescription, doctor, patient, hospital) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `prescription_${prescription._id}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/prescriptions', filename);
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text(hospital?.name || 'HealHub Hospital', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(hospital?.address?.street || '', { align: 'center' });
    doc.text(`Phone: ${hospital?.phone || ''} | Email: ${hospital?.email || ''}`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Doctor info
    doc.fontSize(12).font('Helvetica-Bold').text(`Dr. ${doctor.firstName} ${doctor.lastName}`);
    doc.fontSize(10).font('Helvetica').text(`${doctor.specialization || 'General Physician'}`);
    doc.text(`License: ${doctor.licenseNumber || 'N/A'}`);
    doc.moveDown();

    // Patient info
    doc.fontSize(10).font('Helvetica-Bold').text('Patient Details:', { underline: true });
    doc.font('Helvetica');
    doc.text(`Name: ${patient.firstName} ${patient.lastName}`);
    doc.text(`Age: ${patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : 'N/A'} | Gender: ${patient.gender || 'N/A'} | Blood Group: ${patient.bloodGroup || 'N/A'}`);
    doc.text(`Date: ${new Date(prescription.date).toLocaleDateString('en-IN')}`);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Allergies warning
    if (patient.allergies && patient.allergies.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('red').text('⚠ ALLERGIES: ' + patient.allergies.map(a => a.name).join(', '));
      doc.fillColor('black');
      doc.moveDown();
    }

    // Diagnosis
    if (prescription.diagnosis && prescription.diagnosis.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('Diagnosis:');
      doc.fontSize(10).font('Helvetica');
      prescription.diagnosis.forEach(d => doc.text(`  • ${d}`));
      doc.moveDown();
    }

    // Rx Symbol
    doc.fontSize(18).font('Helvetica-Bold').text('℞', { continued: false });
    doc.moveDown(0.5);

    // Medications
    if (prescription.medications && prescription.medications.length > 0) {
      const tableTop = doc.y;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('No.', 50, tableTop, { width: 30 });
      doc.text('Medicine', 80, tableTop, { width: 180 });
      doc.text('Dosage', 260, tableTop, { width: 80 });
      doc.text('Frequency', 340, tableTop, { width: 80 });
      doc.text('Duration', 420, tableTop, { width: 60 });
      doc.text('Timing', 480, tableTop, { width: 65 });
      
      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
      let y = tableTop + 20;

      doc.fontSize(9).font('Helvetica');
      prescription.medications.forEach((med, i) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        doc.text(`${i + 1}.`, 50, y, { width: 30 });
        doc.text(med.name, 80, y, { width: 180 });
        doc.text(med.dosage, 260, y, { width: 80 });
        doc.text(med.frequency, 340, y, { width: 80 });
        doc.text(med.duration || '-', 420, y, { width: 60 });
        doc.text(med.timing || '-', 480, y, { width: 65 });
        if (med.instructions) {
          y += 14;
          doc.fontSize(8).fillColor('gray').text(`  Note: ${med.instructions}`, 80, y, { width: 400 });
          doc.fillColor('black').fontSize(9);
        }
        y += 18;
      });
    }
    doc.moveDown(2);

    // Investigations
    if (prescription.investigations && prescription.investigations.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('Investigations:');
      doc.fontSize(10).font('Helvetica');
      prescription.investigations.forEach(inv => doc.text(`  • ${inv.name}${inv.instructions ? ' - ' + inv.instructions : ''}`));
      doc.moveDown();
    }

    // Advice
    if (prescription.advice && prescription.advice.length > 0) {
      doc.fontSize(11).font('Helvetica-Bold').text('Advice:');
      doc.fontSize(10).font('Helvetica');
      prescription.advice.forEach(a => doc.text(`  • ${a}`));
      doc.moveDown();
    }

    // Follow-up
    if (prescription.followUpDate) {
      doc.fontSize(10).font('Helvetica-Bold').text(`Follow-up: ${new Date(prescription.followUpDate).toLocaleDateString('en-IN')}`);
      if (prescription.followUpInstructions) doc.font('Helvetica').text(prescription.followUpInstructions);
      doc.moveDown();
    }

    // Signature
    doc.moveDown(2);
    doc.moveTo(380, doc.y).lineTo(545, doc.y).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text(`Dr. ${doctor.firstName} ${doctor.lastName}`, 380, doc.y + 5);
    doc.fontSize(9).font('Helvetica').text(doctor.specialization || '', 380);
    doc.text(`Reg. No: ${doctor.licenseNumber || ''}`, 380);

    // Footer
    doc.fontSize(7).font('Helvetica').fillColor('gray');
    doc.text('This is a digitally generated prescription from HealHub Healthcare System', 50, 780, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ filename, filepath: `/uploads/prescriptions/${filename}` }));
    stream.on('error', reject);
  });
}

function generateInvoicePDF(billing, patient, hospital) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `invoice_${billing.invoiceNumber}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/prescriptions', filename);
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    doc.fontSize(20).font('Helvetica-Bold').text(hospital?.name || 'HealHub', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('INVOICE', { align: 'center' });
    doc.moveDown();

    doc.text(`Invoice #: ${billing.invoiceNumber}`);
    doc.text(`Date: ${new Date(billing.date).toLocaleDateString('en-IN')}`);
    doc.text(`Patient: ${patient.firstName} ${patient.lastName}`);
    doc.moveDown();

    // Items table
    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Description', 50, y, { width: 200 });
    doc.text('Qty', 260, y, { width: 40 });
    doc.text('Price', 310, y, { width: 80 });
    doc.text('Total', 400, y, { width: 80 });
    y += 20;

    doc.font('Helvetica').fontSize(9);
    (billing.items || []).forEach(item => {
      doc.text(item.description || '', 50, y, { width: 200 });
      doc.text(String(item.quantity || 1), 260, y, { width: 40 });
      doc.text(`₹${item.unitPrice || 0}`, 310, y, { width: 80 });
      doc.text(`₹${item.total || 0}`, 400, y, { width: 80 });
      y += 16;
    });

    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(`Total: ₹${billing.totalAmount}`, { align: 'right' });

    doc.end();
    stream.on('finish', () => resolve({ filename, filepath: `/uploads/prescriptions/${filename}` }));
    stream.on('error', reject);
  });
}

function calculateAge(dob) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
}

module.exports = { generatePrescriptionPDF, generateInvoicePDF };
