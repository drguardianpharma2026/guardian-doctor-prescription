export const printHeaderSlip = (data) => {
  if (!data) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Popup blocked! Please allow popups for this site.');
    return;
  }

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
        // YYYY-MM-DD -> DD-MM-YYYY
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
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
};
