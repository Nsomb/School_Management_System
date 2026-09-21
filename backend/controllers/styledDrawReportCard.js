const path = require('path');
const fs = require('fs');

module.exports = function drawStyledReportCard(doc, data) {
    if (!doc) {
        throw new Error('PDF document instance is missing.');
    }

    if (!doc.page) {
        doc.addPage();
    }

    let pageWidth, pageHeight;
    try {
        pageWidth = doc.page.width;
        pageHeight = doc.page.height;
    } catch (e) {
        throw new Error('Failed to get PDF page dimensions.');
    }

    const margin = 40;
    const startX = margin;
    const tableWidth = pageWidth - margin * 2;
    let y = margin;

    const schoolName = process.env.SCHOOL_NAME || 'UNIQUE BILINGUAL COMPREHENSIVE HIGH SCHOOL TONGA';
    const logoPath = path.join(__dirname, '../assets/logo.png');
    const headerImagePath = path.join(__dirname, '../assets/student_info_icon.png');

    const fonts = {
        header: { size: 22, family: 'Helvetica-Bold' },
        subheader: { size: 11, family: 'Helvetica-Bold' },
        title: { size: 9, family: 'Helvetica' },
        body: { size: 8.5, family: 'Helvetica' },
        small: { size: 6.5, family: 'Helvetica' }
    };

    const colors = {
        primary: '#1155cc',
        secondary: '#333333',
        lightBg: '#f5f5f5',
        tableBorder: '#dddddd',
        text: '#000000',
        white: '#ffffff',
        fail: '#dc3545',
        pass: '#28a745'
    };

    // --- HEADER SECTION ---
    let currentY = y;
    const logoSize = 40;
    const headerImageSize = 40;

    // Place main school logo
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, startX, currentY, { width: logoSize, height: logoSize });
    }

    // Place the header image
    const image1X = startX + logoSize + 8;
    if (fs.existsSync(headerImagePath)) {
        doc.image(headerImagePath, image1X, currentY, { width: headerImageSize, height: headerImageSize });
    }

    const textBlockX = image1X + headerImageSize + 8;
    const textBlockWidth = tableWidth - (textBlockX - startX);

    // School Name
    doc.fillColor(colors.primary)
        .font(fonts.header.family)
        .fontSize(fonts.header.size)
        .text(schoolName, textBlockX, currentY + (logoSize / 2) - (doc.heightOfString(schoolName, { width: textBlockWidth }) / 2), {
            width: textBlockWidth,
            align: 'center'
        });
    currentY += doc.heightOfString(schoolName, { width: textBlockWidth }) + 1;

    // Report Card Title
    doc.fillColor(colors.secondary)
        .font(fonts.subheader.family)
        .fontSize(fonts.subheader.size)
        .text(`${data.header.term.toUpperCase()} REPORT CARD`, textBlockX, currentY, {
            width: textBlockWidth,
            align: 'center'
        });
    currentY += doc.heightOfString(`${data.header.term.toUpperCase()} REPORT CARD`, { width: textBlockWidth }) + 1;

    // Academic Year
    doc.fillColor(colors.secondary)
        .font(fonts.title.family)
        .fontSize(fonts.title.size)
        .text(`Academic Year: ${data.header.academicYear}`, textBlockX, currentY, {
            width: textBlockWidth,
            align: 'center'
        });
    currentY += doc.heightOfString(`Academic Year: ${data.header.academicYear}`, { width: textBlockWidth }) + 2;

    y = currentY;

    // --- STUDENT INFORMATION BLOCK ---
    const studentInfoBlockHeight = 65;
    doc.rect(startX, y, tableWidth, studentInfoBlockHeight)
        .fillAndStroke(colors.lightBg, colors.tableBorder);

    const infoCol1X = startX + 15;
    const infoCol2X = startX + tableWidth / 2 + 10;
    let infoLineY = y + 8;

    const drawInfoField = (label, value, xPos, yPos) => {
        doc.font('Helvetica-Bold')
            .fontSize(fonts.body.size)
            .fillColor(colors.secondary)
            .text(`${label}:`, xPos, yPos, { continued: true })
            .font('Helvetica')
            .fillColor(colors.text)
            .text(` ${value}`);
    };

    if (data.studentInfo) {
        drawInfoField('Name', data.studentInfo.name || 'N/A', infoCol1X, infoLineY);
        drawInfoField('Date of Birth', data.studentInfo.dob, infoCol2X, infoLineY);
        infoLineY += 11;
        drawInfoField('Class', data.studentInfo.class || 'N/A', infoCol1X, infoLineY);
        drawInfoField('Specialty', data.studentInfo.specialty || 'N/A', infoCol2X, infoLineY);
        infoLineY += 11;
        drawInfoField('Faculty', data.studentInfo.faculty || 'N/A', infoCol1X, infoLineY);
        drawInfoField('Gender', data.studentInfo.gender || 'N/A', infoCol2X, infoLineY);
    }

    y += studentInfoBlockHeight + 3;

    // --- SUBJECTS TABLE ---
    const columns = [
        { name: 'Subject', width: 140, align: 'left' },
        { name: 'Coeff', width: 45, align: 'center' },
        { name: 'Eval1', width: 45, align: 'center' },
        { name: 'Eval2', width: 45, align: 'center' },
        { name: 'Average', width: 55, align: 'center' },
        { name: 'Total', width: 55, align: 'center' },
        { name: 'Remark', width: 65, align: 'center' }
    ];

    const rowHeight = 14;

    // Table Header Row
    doc.rect(startX, y, tableWidth, rowHeight).fill(colors.primary);
    let currentColumnX = startX;

    columns.forEach(col => {
        doc.moveTo(currentColumnX, y).lineTo(currentColumnX, y + rowHeight).stroke(colors.white, 0.5);
        doc.fillColor(colors.white)
            .font('Helvetica-Bold')
            .fontSize(fonts.body.size)
            .text(col.name,
                currentColumnX + (col.align === 'left' ? 4 : 0),
                y + (rowHeight - doc.heightOfString(col.name, { width: col.width })) / 2,
                { width: col.width, align: col.align }
            );
        currentColumnX += col.width;
    });
    doc.moveTo(currentColumnX, y).lineTo(currentColumnX, y + rowHeight).stroke(colors.white, 0.5);
    y += rowHeight;

    // Table Rows (Subject Data)
    data.subjects.forEach((subject, i) => {
        // Check if we need a new page (leave space for summary section)
        if (y + rowHeight > pageHeight - 120) {
            doc.addPage();
            y = margin;
        }

        const bgColor = i % 2 === 0 ? colors.white : colors.lightBg;
        doc.rect(startX, y, tableWidth, rowHeight).fill(bgColor).stroke(colors.tableBorder);

        let currentColumnX = startX;

        const values = [
            subject.subject_name,
            subject.coefficient,
            subject.eval1,
            subject.eval2,
            subject.average,
            subject.total,
            subject.remark
        ];

        columns.forEach((col, colIdx) => {
            doc.moveTo(currentColumnX, y).lineTo(currentColumnX, y + rowHeight).stroke(colors.tableBorder, 0.5);

            let valueToDisplay = (values[colIdx] !== undefined && values[colIdx] !== null) ? String(values[colIdx]) : '-';
            let textColor = colors.text;

            if (col.name === 'Eval1' || col.name === 'Eval2' || col.name === 'Average' || col.name === 'Total') {
                const numericValue = parseFloat(valueToDisplay);
                if (!isNaN(numericValue) && numericValue < 10) {
                    textColor = colors.fail;
                }
            } else if (col.name === 'Remark' && valueToDisplay.toLowerCase() === 'fail') {
                textColor = colors.fail;
            }

            const textX = (col.align === 'left') ? currentColumnX + 4 : currentColumnX;

            doc.fillColor(textColor)
                .font(fonts.body.family)
                .fontSize(fonts.body.size)
                .text(valueToDisplay,
                    textX,
                    y + (rowHeight - doc.heightOfString(valueToDisplay, { width: col.width, align: col.align })) / 2,
                    { width: col.width, align: col.align, continued: false }
                );

            doc.fillColor(colors.text);
            currentColumnX += col.width;
        });
        doc.moveTo(currentColumnX, y).lineTo(currentColumnX, y + rowHeight).stroke(colors.tableBorder, 0.5);
        y += rowHeight;
    });
    y += 3;

    // --- SUMMARY INFORMATION ---
    const summaryBlockHeight = 55;
    
    // Ensure summary fits on current page
    if (y + summaryBlockHeight > pageHeight - 30) {
        doc.addPage();
        y = margin;
    }

    doc.rect(startX, y, tableWidth, summaryBlockHeight)
        .fillAndStroke(colors.lightBg, colors.tableBorder);

    const summaryCol1X = startX + 12;
    const summaryCol2X = startX + tableWidth / 2 + 12;
    let summaryLineY = y + 8;

    // Row 1
    doc.font('Helvetica-Bold').fontSize(fonts.body.size).fillColor(colors.secondary);
    doc.text(`Total Coefficient: ${data.summary.totalCoeff}`, summaryCol1X, summaryLineY, { width: (tableWidth / 2) - 20 });
    doc.text(`Total Score: ${data.summary.totalScore}`, summaryCol2X, summaryLineY, { width: (tableWidth / 2) - 20 });
    summaryLineY += 12;

    // Row 2
    doc.text(`Term Average: ${data.summary.termAverage}`, summaryCol1X, summaryLineY, { width: (tableWidth / 2) - 20 });
    doc.text(`Class Average: ${data.summary.classAverage || 'N/A'}`, summaryCol2X, summaryLineY, { width: (tableWidth / 2) - 20 });
    summaryLineY += 12;

    // Row 3: Rank, Decision with conditional box
    doc.text(`Rank: ${data.summary.rank || 'N/A'}`, summaryCol1X, summaryLineY, { width: (tableWidth / 2) - 20 });

    const isThirdTerm = data.header.term.toLowerCase().includes('3rd');
    const decisionText = data.summary.decision;
    const decisionColor = parseFloat(data.summary.termAverage) >= 10 ? colors.pass : colors.fail;

    const decisionLabelWidth = doc.widthOfString('Decision: ');
    const boxSize = 8;
    const textGap = 2;

    const decisionLabelX = summaryCol2X;
    doc.font('Helvetica-Bold').fillColor(colors.secondary)
       .text(`Decision:`, decisionLabelX, summaryLineY);

    const boxX = decisionLabelX + decisionLabelWidth + textGap;
    const boxY = summaryLineY + (doc.heightOfString('Decision:', { align: 'left' }) / 2) - (boxSize / 2);

    if (!isThirdTerm) {
        doc.rect(boxX, boxY, boxSize, boxSize).stroke(decisionColor);

        if (decisionText.toLowerCase() === 'pass') {
            doc.strokeColor(colors.pass)
                .lineWidth(1.5)
                .moveTo(boxX + boxSize * 0.2, boxY + boxSize * 0.5)
                .lineTo(boxX + boxSize * 0.45, boxY + boxSize * 0.8)
                .lineTo(boxX + boxSize * 0.8, boxY + boxSize * 0.2)
                .stroke();
        } else {
            doc.strokeColor(colors.fail)
                .lineWidth(1.5)
                .moveTo(boxX + boxSize * 0.2, boxY + boxSize * 0.2)
                .lineTo(boxX + boxSize * 0.8, boxY + boxSize * 0.8)
                .moveTo(boxX + boxSize * 0.8, boxY + boxSize * 0.2)
                .lineTo(boxX + boxSize * 0.2, boxY + boxSize * 0.8)
                .stroke();
        }
        doc.fillColor(decisionColor)
           .font('Helvetica')
           .text(decisionText, boxX + boxSize + textGap, summaryLineY);
    } else {
        doc.fillColor(decisionColor)
           .font('Helvetica')
           .text(decisionText, boxX, summaryLineY);
    }

    y += summaryBlockHeight + 6;

    // --- PRINCIPAL SIGNATURE ---
    const signatureWidth = 180;
    const signatureX = pageWidth - margin - signatureWidth;
    
    // Ensure signature fits on current page
    if (y + 25 > pageHeight - 20) {
        doc.addPage();
        y = margin;
    }
    
    doc.moveTo(signatureX, y + 8).lineTo(signatureX + signatureWidth, y + 8).stroke(colors.secondary, 1);
    doc.font(fonts.body.family)
        .fontSize(fonts.body.size)
        .fillColor(colors.secondary)
        .text('Principal Signature', signatureX, y + 12, {
            width: signatureWidth,
            align: 'center'
        });
    y += 20;

    // --- FOOTER ("Official Document - For school use only") ON FIRST PAGE ---
    // Add footer to the first page only
    const firstPage = doc.bufferedPageRange().start;
    doc.switchToPage(firstPage);
    
    doc.font(fonts.small.family)
        .fontSize(fonts.small.size)
        .fillColor(colors.secondary)
        .text('Official Document - For school use only', startX, pageHeight - 15, {
            width: tableWidth,
            align: 'center'
        });
};