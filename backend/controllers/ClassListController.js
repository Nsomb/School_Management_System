// backend/controllers/ClassListController.js
const ClassListModel = require('../models/ClassListModel');
const PDFDocument = require('pdfkit');
const { addClassHeader } = require('../utils/classPdfHeader');
const { getSchoolConfig } = require('../services/schoolConfigCache');

const getCameroonAcademicYear = (date = new Date()) => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  return m >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
};

const ClassListController = {
  getBlankMarkEntrySheet: async (req, res) => {
    try {
      const { class_name } = req.query;
      if (!class_name) return res.status(400).json({ error: 'class_name query parameter is required.' });

      const students = await ClassListModel.getStudentsForBlankMarkSheet(class_name, req.schoolId);
      if (!students || students.length === 0) {
        return res.status(404).json({ error: `No students found for class "${class_name}".` });
      }

      let csv = 'Roll No,Student Full Name                                                ,Sex,Date of Birth          ,E1,E2,T1,E3,E4,T2,E5,E6,T3,COEF,GEN AVG\n';

      students.forEach((student, index) => {
        const rollNo = String(index + 1).padEnd(3, ' ');
        const rawName = (student.student_name || 'UNNAMED').toUpperCase().padEnd(50, ' ');
        const sanitizedName = `"${rawName.replace(/"/g, '""')}"`;
        const sex = student.sex ? `"${student.sex.charAt(0).toUpperCase()}"` : '""';
        const dobText = student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '';
        const paddedDob = `"${dobText.padEnd(20, ' ')}"`;
        csv += `${rollNo},${sanitizedName},${sex},${paddedDob},,,,,,,,,,,\n`;
      });

      const fileName = `MarkSheet_${class_name.replace(/\s+/g, '_')}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.status(200).send('\uFEFF' + csv);
    } catch (error) {
      console.error('Error generating CSV mark sheet:', error);
      return res.status(500).json({ error: 'Failed to generate CSV file.' });
    }
  },

  getDistinctClassNamesFromStudents: async (req, res) => {
    try {
      const classes = await ClassListModel.getDistinctClassNames(req.schoolId);
      return res.status(200).json({ classes });
    } catch (error) {
      console.error('Error fetching class names:', error);
      return res.status(500).json({ error: 'Failed to fetch class list.' });
    }
  },

  getCurrentClassStudents: async (req, res) => {
    try {
      const { class_name } = req.query;
      if (!class_name) return res.status(400).json({ error: 'class_name required.' });
      const students = await ClassListModel.getStudentsForBlankMarkSheet(class_name, req.schoolId);
      return res.status(200).json({ class_name, total: students.length, students });
    } catch (error) {
      console.error('Error fetching students:', error);
      return res.status(500).json({ error: 'Failed to fetch student data.' });
    }
  },

  downloadClassListPDF: async (req, res) => {
    try {
      const { class_name } = req.query;
      if (!class_name) return res.status(400).json({ error: 'class_name query parameter is required.' });

      const students = await ClassListModel.getStudentsForBlankMarkSheet(class_name, req.schoolId);
      if (!students || students.length === 0) {
        return res.status(404).json({ error: `No students found for class "${class_name}".` });
      }

      const school = await getSchoolConfig(req.schoolId);
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'portrait', bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));
      doc.on('end', () => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="ClassList_${class_name}.pdf"`);
        res.send(Buffer.concat(chunks));
      });

      const marginX = 30;
      const usableWidth = doc.page.width - 2 * marginX;
      const rowHeight = 16;
      const academicYear = getCameroonAcademicYear();

      const cols = [
        { id: 'num', label: '#', width: 20, align: 'center' },
        { id: 'name', label: 'FULL NAME', width: 215, align: 'left' },
        { id: 'sex', label: 'SEX', width: 25, align: 'center' },
        { id: 'dob', label: 'DOB', width: 65, align: 'center' },
        { id: 'e1', label: 'E1', width: 35, align: 'center' },
        { id: 'e2', label: 'E2', width: 35, align: 'center' },
        { id: 'e3', label: 'E3', width: 35, align: 'center' },
        { id: 'e4', label: 'E4', width: 35, align: 'center' },
        { id: 'e5', label: 'E5', width: 35, align: 'center' },
        { id: 'e6', label: 'E6', width: 35, align: 'center' },
      ];

      const drawTableHeader = (startY) => {
        doc.rect(marginX, startY, usableWidth, 16).fill('#1a4b8c');
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#FFFFFF');
        let x = marginX;
        cols.forEach(c => {
          doc.text(c.label, x + 2, startY + 4, { width: c.width - 4, align: c.align });
          x += c.width;
        });
        return startY + 16;
      };

      const headerSubtitle = `CLASS LIST / MARK SHEET - ${class_name.toUpperCase()} (${academicYear})`;
      let y = addClassHeader(doc, school, headerSubtitle);
      y = drawTableHeader(y + 8);

      students.forEach((student, idx) => {
        if (y + rowHeight > 780) {
          doc.addPage();
          const newY = addClassHeader(doc, school, `${headerSubtitle} (Continuation)`);
          y = drawTableHeader(newY + 8);
        }
        if (idx % 2 === 0) doc.rect(marginX, y, usableWidth, rowHeight).fill('#F8F9FA');

        const dobText = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('en-GB') : '-';
        const sexText = student.sex ? student.sex.charAt(0).toUpperCase() : '-';
        const nameText = (student.student_name || 'UNNAMED').toUpperCase();
        const rowData = [String(idx + 1), nameText, sexText, dobText, '', '', '', '', '', ''];

        let cellX = marginX;
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#222222');
        cols.forEach((c, i) => {
          const text = rowData[i];
          if (text) doc.text(text, cellX + 3, y + 4, { width: c.width - 6, align: c.align, ellipsis: true });
          doc.strokeColor('#DCDCDC').lineWidth(0.5).moveTo(cellX, y).lineTo(cellX, y + rowHeight).stroke();
          cellX += c.width;
        });
        doc.strokeColor('#DCDCDC').lineWidth(0.5).moveTo(cellX, y).lineTo(cellX, y + rowHeight).stroke();
        doc.strokeColor('#E0E0E0').lineWidth(0.5).moveTo(marginX, y + rowHeight).lineTo(marginX + usableWidth, y + rowHeight).stroke();
        y += rowHeight;
      });

      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.strokeColor('#CCCCCC').lineWidth(0.5).moveTo(marginX, 800).lineTo(marginX + usableWidth, 800).stroke();
        doc.fontSize(6).font('Helvetica-BoldOblique').fillColor('#666666')
          .text(`Class: ${class_name}  •  Total Students: ${students.length}  •  Academic Year: ${academicYear}`,
            marginX, 806, { width: usableWidth / 2, align: 'left' });
        doc.text(`Page ${i + 1} of ${range.count}`,
          marginX + usableWidth / 2, 806, { width: usableWidth / 2, align: 'right' });
      }

      doc.end();
    } catch (error) {
      console.error('Error generating class list PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF.' });
    }
  },
};

module.exports = ClassListController;