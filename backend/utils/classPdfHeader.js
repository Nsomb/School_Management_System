// utils/classPdfHeader.js
const path = require('path');

const COUNTRY = {
  nameEn: 'REPUBLIC OF CAMEROON',
  nameFr: 'RÉPUBLIQUE DU CAMEROUN',
  mottoEn: 'Peace – Work – Fatherland',
  mottoFr: 'Paix – Travail – Patrie',
  defaultMinistryEn: 'MINISTRY OF SECONDARY EDUCATION',
  defaultMinistryFr: "MINISTÈRE DE L'ENSEIGNEMENT SECONDAIRE",
};

const resolveLogoPath = (logoUrl) => {
  if (!logoUrl) return null;
  const cleanUrl = logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl;
  return path.join(__dirname, '..', cleanUrl);
};

/**
 * Adds the official bilingual Cameroon header to any PDF.
 * Left: English | Center: logo + school motto | Right: French
 */
function addClassHeader(doc, school, title = '') {
  const {
    name: schoolName,
    name_french: schoolNameFrench,
    motto: schoolMotto,
    motto_french: schoolMottoFrench,
    ministry,
    ministry_french: ministryFrench,
    region,
    region_french: regionFrench,
    division,
    division_french: divisionFrench,
    logo_url: logoUrl,
  } = school || {};

  const logoPath = resolveLogoPath(logoUrl);

  const pageWidth = doc.page.width;
  const leftMargin = 30;
  const rightMargin = 30;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  const centerWidth = 140;
  const gap = 8;
  const colWidth = (contentWidth - centerWidth - gap * 2) / 2;
  const leftX = leftMargin;
  const rightX = leftX + colWidth + gap + centerWidth + gap;
  const centerX = leftX + colWidth + gap;
  const separator = '*****';
  const startY = 25;

  const leftLines = [
    { text: COUNTRY.nameEn, bold: true },
    { sep: true },
    { text: COUNTRY.mottoEn, bold: true, italic: true },
    { sep: true },
    { text: ministry || COUNTRY.defaultMinistryEn, bold: true },
  ];
  if (region) {
    leftLines.push({ sep: true }, { text: `REGIONAL DELEGATION OF ${region.toUpperCase()}`, bold: true });
  }
  if (division) {
    leftLines.push({ sep: true }, { text: `DIVISIONAL DELEGATION OF ${division.toUpperCase()}`, bold: true });
  }
  leftLines.push({ sep: true }, { text: (schoolName || '').toUpperCase(), bold: true });

  const rightLines = [
    { text: COUNTRY.nameFr, bold: true },
    { sep: true },
    { text: COUNTRY.mottoFr, bold: true, italic: true },
    { sep: true },
    { text: ministryFrench || COUNTRY.defaultMinistryFr, bold: true },
  ];
  if (regionFrench) {
    rightLines.push({ sep: true }, { text: `DÉLÉGATION RÉGIONALE DE ${regionFrench.toUpperCase()}`, bold: true });
  }
  if (divisionFrench) {
    rightLines.push({ sep: true }, { text: `DÉLÉGATION DÉPARTEMENTALE DE ${divisionFrench.toUpperCase()}`, bold: true });
  }
  rightLines.push({ sep: true }, { text: (schoolNameFrench || schoolName || '').toUpperCase(), bold: true });

  const drawColumn = (x, width, lines, align) => {
    let cy = startY;
    lines.forEach((line) => {
      if (line.sep) {
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');
        doc.text(separator, x, cy, { width, align: 'center' });
        cy += 7;
      } else {
        const font = line.bold && line.italic ? 'Helvetica-BoldOblique'
          : line.bold ? 'Helvetica-Bold'
          : line.italic ? 'Helvetica-Oblique'
          : 'Helvetica';
        doc.fontSize(6).font(font).fillColor('#000000');
        doc.text(line.text, x, cy, { width, align });
        cy += 9;
      }
    });
    return cy;
  };

  const leftEndY = drawColumn(leftX, colWidth, leftLines, 'center');
  const rightEndY = drawColumn(rightX, colWidth, rightLines, 'center');
  const afterColumnsY = Math.max(leftEndY, rightEndY) + 4;

  // ─── Center oval with logo + SCHOOL MOTTO ───
  const ovalCenterY = startY + 48;
  doc.save();
  doc.lineWidth(1.2).strokeColor('#000000');
  doc.ellipse(centerX + centerWidth / 2, ovalCenterY, centerWidth / 2 - 10, 40).stroke();
  doc.restore();

  if (logoPath) {
    try {
      doc.image(logoPath, centerX + centerWidth / 2 - 18, ovalCenterY - 32, { width: 36, height: 36 });
    } catch (e) {
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');
      doc.text('School Logo', centerX, ovalCenterY - 16, { width: centerWidth, align: 'center' });
    }
  } else {
    doc.fontSize(6).font('Helvetica-Bold').fillColor('#000000');
    doc.text('School Logo', centerX, ovalCenterY - 16, { width: centerWidth, align: 'center' });
  }

  // School motto — inside the oval, below the logo
  const schoolMottoText = schoolMottoFrench || schoolMotto;
  if (schoolMottoText) {
    doc.fontSize(5.5).font('Helvetica-BoldOblique').fillColor('#000000');
    doc.text(schoolMottoText.toUpperCase(), centerX, ovalCenterY + 10, {
      width: centerWidth,
      align: 'center',
    });
  }

  // ─── School name + divider + optional title ───
  const schoolNameDisplay = schoolName || 'SCHOOL NAME';
  const schoolNameY = Math.max(afterColumnsY, ovalCenterY + 48);

  doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
  doc.text(schoolNameDisplay.toUpperCase(), leftMargin, schoolNameY, { width: contentWidth, align: 'center' });

  const lineY = schoolNameY + 16;
  doc.strokeColor('#000000').lineWidth(1).moveTo(leftMargin, lineY).lineTo(leftMargin + contentWidth, lineY).stroke();

  if (title) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
    doc.text(title.toUpperCase(), leftMargin, lineY + 6, { width: contentWidth, align: 'center' });
    return lineY + 20;
  }
  return lineY + 8;
}

module.exports = { addClassHeader, COUNTRY };