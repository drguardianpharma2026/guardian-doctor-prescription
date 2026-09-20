export const printHTML = (htmlContent) => {
  if (!htmlContent) return;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

  // On Mobile or Desktop, use iframe printing as primary mechanism to prevent popup blocking
  let iframe = document.getElementById('nexus-print-iframe');
  if (iframe) {
    try { iframe.remove(); } catch (e) { }
  }

  iframe = document.createElement('iframe');
  iframe.id = 'nexus-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Iframe print error, attempting fallback window:', err);
        fallbackWindowPrint(htmlContent);
      }
    };

    // Give browser time to load fonts, CSS and render layout before print
    if (isMobile) {
      setTimeout(doPrint, 500);
    } else {
      setTimeout(doPrint, 300);
    }
  } catch (err) {
    console.error('Iframe document write error:', err);
    fallbackWindowPrint(htmlContent);
  }
};

const fallbackWindowPrint = (htmlContent) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Printing requires popups enabled or print permission. Please allow popups for this site.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    try {
      printWindow.print();
    } catch (e) { }
  }, 400);
};

export const printHeaderSlip = (data) => {
  if (!data) return;

  const mrn = data.mrn || '---';
  const rawName = data.patientName || data.patient_name || data.name || '';
  const name = rawName.trim().toUpperCase();
  const age = data.age ? String(data.age).trim() : '';

  let sex = (data.gender || data.sex || '').trim().toUpperCase();
  if (sex === 'M' || sex === 'MALE' || sex === 'Y/M') sex = 'MALE';
  else if (sex === 'F' || sex === 'FEMALE' || sex === 'Y/F') sex = 'FEMALE';

  // Format date to DD-MM-YYYY
  let formattedDate = '';
  const rawDate = data.date || data.registration_date || data.updated_at || new Date().toISOString().split('T')[0];
  if (rawDate) {
    const dateOnly = String(rawDate).trim().split(' ')[0];
    if (dateOnly.includes('-')) {
      const parts = dateOnly.split('-');
      if (parts[0].length === 4) {
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      } else {
        formattedDate = dateOnly;
      }
    } else if (dateOnly.includes('/')) {
      const parts = dateOnly.split('/');
      if (parts[2]?.length === 4) {
        formattedDate = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
      } else {
        formattedDate = dateOnly;
      }
    } else {
      formattedDate = dateOnly;
    }
  }

  let ageSexPart = '';
  if (age && sex) ageSexPart = `${age} / ${sex}`;
  else if (age) ageSexPart = `${age}`;
  else if (sex) ageSexPart = `${sex}`;

  const patientLine = ageSexPart ? `${name}, ${ageSexPart}` : name;

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Patient Header Slip - ${mrn}</title>
        <style>
          @page {
            size: auto;
            margin: 5mm 10mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            color: #000;
            margin: 0;
            padding: 12px;
            background: #fff;
          }
          .headline-box {
            width: 100%;
            max-width: 750px;
            margin: 6cm auto 0 auto;
            font-weight: bold;
          }
          .hr-line {
            border: none;
            border-top: 1.5px solid #000;
            margin: 6px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            line-height: 1.8;
          }
          .field-label {
            display: inline-block;
            min-width: 110px;
          }
          .colon {
            display: inline-block;
            margin: 0 8px 0 2px;
          }
          @media print {
            body { padding: 0; }
            .headline-box {
              margin-top: 6cm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="headline-box">
          <div class="row">
            <div>
              <span class="field-label">MRN No</span><span class="colon">:</span><span>${mrn}</span>
            </div>
            <div>
              <span class="field-label" style="min-width: auto; margin-right: 4px;">Date</span><span class="colon">:</span><span>${formattedDate}</span>
            </div>
          </div>
          <div class="row" style="justify-content: flex-start;">
            <span class="field-label">Patient Name</span><span class="colon">:</span><span>${patientLine}</span>
          </div>
        </div>
      </body>
    </html>
  `;

  printHTML(content);
};

export const printPrescription = (paperElementOrHtml) => {
  let innerHtml = typeof paperElementOrHtml === 'string'
    ? paperElementOrHtml
    : (paperElementOrHtml ? paperElementOrHtml.outerHTML : '');

  if (!innerHtml) return;

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Prescription Print</title>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;900&family=Inter:wght@400;600;700&display=swap" />
        <style>
          @page { margin: 0; size: A4 portrait; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: white; font-family: 'Noto Sans Tamil', 'Inter', sans-serif; display: flex; justify-content: center; }
          #paper-wrapper { width: 100%; display: flex; justify-content: center; padding: 0; }
          #prescription-paper { width: 100%; max-width: 210mm; min-height: 297mm; background: white; box-shadow: none; border: none; padding: 1cm; margin: 0; }
          @media print {
            body { background: white !important; }
            #paper-wrapper { padding: 0 !important; }
            #prescription-paper { box-shadow: none !important; width: 100% !important; padding: 1cm !important; margin: 0 !important; }
          }
        </style>
      </head>
      <body>
        <div id="paper-wrapper">${innerHtml}</div>
      </body>
    </html>
  `;

  printHTML(content);
};
