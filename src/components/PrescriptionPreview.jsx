import React from 'react';

const PrescriptionPreview = ({ data }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const tdStyle = {
    border: '1px solid #777',
    padding: '5pt 8pt',
    fontSize: '10.5pt',
    verticalAlign: 'top',
  };

  const thStyle = {
    border: '1px solid #777',
    padding: '5pt 8pt',
    fontSize: '9pt',
    fontWeight: 700,
    textAlign: 'center',
    background: '#f0f0f0',
    verticalAlign: 'middle',
    textTransform: 'uppercase'
  };

  React.useEffect(() => {
    const handleBeforePrint = () => {
      document.title = "";
    };
    const handleAfterPrint = () => {
      document.title = "Prescription Preview";
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  return (
    <div
      className="print-container"
      id="prescription-paper"
      style={{
        padding: '0 1.2cm 1cm 1.2cm',
        background: 'white',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        color: '#000',
        fontFamily: "'Times New Roman', Times, serif",
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page { 
              margin: 0 !important; 
            }
            html, body { 
              margin: 0 !important; 
              padding: 0 !important;
              background: #fff !important;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important;
            }
            #prescription-paper {
              position: relative;
              margin: 0 auto !important;
              padding-top: 2cm !important;
              padding-bottom: 2cm !important;
              box-shadow: none !important;
              width: 210mm !important;
              min-height: 297mm !important;
            }
            /* Hide modals and overlays during print if they exist in background */
            .modal-overlay, .no-print {
              display: none !important;
            }
          }
        `}} />
      {/* 
        ══ PATIENT INFO ROW (Fills the dotted lines on letterhead) ══
        Positioned at ~6.8cm from top to land on the dots
      */}
      <div style={{
        position: 'absolute',
        top: '4.3cm',
        left: '1.2cm',
        right: '1.2cm',
        fontSize: '10pt',
        zIndex: 10
      }}>
        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10pt', marginBottom: '4pt' }}>
          <div>
            <span style={{ fontStyle: 'italic', fontWeight: 600 }}>MRN</span>
            <span style={{ margin: '0 4pt' }}>:</span>
            <span style={{ fontWeight: 800 }}>{data.mrn || '-------'}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Date</span>
            <span style={{ margin: '0 4pt' }}>:</span>
            <span style={{ fontWeight: 900, color: '#000000' }}>{formatDate(data.date)}</span>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8pt', whiteSpace: 'nowrap', marginBottom: '4pt' }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Name</span>
            <span style={{ margin: '0 4pt' }}>:</span>
            <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{data.patientName || '------------------'}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Age/Sex</span>
            <span style={{ margin: '0 4pt' }}>:</span>
            <span style={{ fontWeight: 800 }}>{data.age || '--'} Y / {data.gender === 'Female' ? 'F' : data.gender === 'Male' ? 'M' : '-'}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontStyle: 'italic', fontWeight: 600 }}>Phone</span>
            <span style={{ margin: '0 4pt' }}>:</span>
            <span style={{ fontWeight: 800 }}>{data.phone || '----------'}</span>
          </div>
        </div>


        {/* Row 3: Vitals Summary */}
        {(data.weight || data.bp || data.pulse || data.temp) && (
          <div style={{ display: 'flex', gap: '15pt', marginTop: '6pt', fontSize: '9pt', color: '#444' }}>
            {data.weight && <div><span style={{ fontStyle: 'italic' }}>Wt:</span> <span style={{ fontWeight: 700 }}>{data.weight} kg</span></div>}
            {data.bp && <div><span style={{ fontStyle: 'italic' }}>BP:</span> <span style={{ fontWeight: 700 }}>{data.bp} mmHg</span></div>}
            {data.pulse && <div><span style={{ fontStyle: 'italic' }}>Pulse:</span> <span style={{ fontWeight: 700 }}>{data.pulse} bpm</span></div>}
            {data.temp && <div><span style={{ fontStyle: 'italic' }}>Temp:</span> <span style={{ fontWeight: 700 }}>{data.temp} °F</span></div>}
          </div>
        )}
      </div>

      {/* ══ SPACER TO START PRINTING AFTER Rx ══ */}
      <div style={{ height: '6.0cm' }}></div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ══ CLINICAL DETAILS ══ */}
        <div style={{ marginTop: '10pt', display: 'flex', flexDirection: 'column', gap: '6pt' }}>
          {data.complaints && (
            <div style={{ fontSize: '10.5pt' }}>
              <span style={{ fontWeight: 800, textDecoration: 'underline' }}>CHIEF COMPLAINTS:</span>
              <div style={{ marginTop: '2pt', paddingLeft: '5pt', fontWeight: 600 }}>
                {data.complaints.split('\n').map((line, i) => (
                  <div key={i} style={{ marginBottom: '2pt' }}>• {line}</div>
                ))}
              </div>
            </div>
          )}

          {data.diagnosis && (
            <div style={{ fontSize: '10.5pt' }}>
              <span style={{ fontWeight: 800, textDecoration: 'underline' }}>DIAGNOSIS:</span>
              <div style={{ marginTop: '2pt', paddingLeft: '5pt', fontWeight: 600 }}>
                {data.diagnosis.split('\n').map((line, i) => (
                  <div key={i} style={{ marginBottom: '2pt' }}>• {line}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ RX SYMBOL ══ */}
        <div style={{ marginTop: '10pt', fontSize: '18pt', fontWeight: 900, fontFamily: 'serif' }}>Rx</div>

        {/* ══ MEDICINES TABLE ══ */}
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '20pt' }}>#</th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Medicine</th>
                <th style={{ ...thStyle, width: '50pt' }}>Dosage</th>
                <th style={{ ...thStyle, width: '80pt' }}>Timing</th>
                <th style={{ ...thStyle, width: '75pt' }}>Schedule</th>
                <th style={{ ...thStyle, width: '70pt' }}>Duration</th>
                <th style={{ ...thStyle, width: '35pt' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(data.medicines && data.medicines.length > 0) ? (
                data.medicines.map((med, index) => {
                  if (!med) return null;
                  // Only show row if at least one field has data
                  if (!med.name && !med.dosage && !med.timing) return null;

                  return (
                    <tr key={index}>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{index + 1}</td>
                      <td style={{ ...tdStyle }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4pt', marginBottom: '1pt' }}>
                          <span style={{ fontSize: '9.5pt', fontWeight: 400, textTransform: 'uppercase' }}>
                            {med.type ? `${med.type}.` : ''}
                          </span>
                          <span style={{ fontSize: '11pt', fontWeight: 700, textTransform: 'uppercase' }}>
                            {med.name || '---'}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 900, color: '#B71C1C', fontSize: '10.5pt' }}>
                        {med.dosage ? med.dosage.replace(/OD|BD|TDS|MOR/g, '').trim() : ''}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9.5pt' }}>
                        {med.timing}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9.5pt' }}>
                        {med.schedule}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontSize: '9.5pt' }}>{med.duration}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>{med.qty}</td>
                    </tr>
                  );
                })
              ) : null}
            </tbody>
          </table>
        </div>

        {/* ══ ADVICE SECTION ══ */}
        {data.advice && (
          <div style={{ marginTop: '10pt', fontSize: '10.5pt' }}>
            <span style={{ fontWeight: 800, textDecoration: 'underline' }}>ADVICE / INSTRUCTIONS:</span>
            <div style={{ marginTop: '2pt', paddingLeft: '5pt', fontWeight: 600 }}>
              {data.advice.split('\n').map((line, i) => (
                <div key={i} style={{ marginBottom: '2pt' }}>• {line}</div>
              ))}
            </div>
          </div>
        )}

        {/* ══ BOTTOM SECTION: REVIEW DATE & SIGNATURE ══ */}
        <div style={{
          marginTop: 'auto',
          paddingBottom: '2cm',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          paddingRight: '1.2cm'
        }}>
          {data.followUp && (
            <div style={{
              fontSize: '10pt',
              fontWeight: 800,
              color: '#c0392b',
              border: '1.5px solid #c0392b',
              padding: '6pt 10pt',
              textTransform: 'uppercase',
              marginTop: '15pt',
              marginBottom: '20pt',
              alignSelf: 'flex-start'
            }}>
              அடுத்த பரிசோதனை நாள் (Review): {formatDate(data.followUp)}
            </div>
          )}

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            {/* Signature Label/Space Area (Small Gap) */}
            <div style={{ height: '25pt' }}></div>

            {/* Doctor Model (Small Size) */}
            <div style={{ fontSize: '10.5pt', fontWeight: 800, marginBottom: '0.5pt' }}>
              {(() => {
                const name = data.doctorName?.trim();
                if (!name) return 'Dr. _________________';
                // If it already starts with Dr or DR, just use it (ensure single prefix)
                if (name.toUpperCase().startsWith('DR.')) return name;
                if (name.toUpperCase().startsWith('DR ')) return `DR. ${name.substring(3)}`;
                return `Dr. ${name}`;
              })()}
            </div>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, marginBottom: '1.5pt' }}>
              {data.doctorQualifications || 'Qualifications'}
            </div>
            <div style={{
              fontSize: '8.5pt',
              fontWeight: 600,
              color: '#444',
              lineHeight: 1.1,
            }}>
              {data.doctorRole || 'Consultant Trauma, Joint Replacement & Spine Surgeon'}
            </div>
            <div style={{ fontSize: '7.5pt', color: '#666', marginTop: '1.5pt' }}>
              Reg No: {data.doctorRegNo || '-------'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionPreview;
