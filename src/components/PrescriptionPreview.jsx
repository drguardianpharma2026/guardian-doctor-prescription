import React from 'react';

const getDosageParts = (dosageStr) => {
  if (!dosageStr) return [];
  // match only digits/fractions/dashes like 1-0-1 or 1/2-0-1/2 or 0.5-0-0.5
  const cleaned = dosageStr.replace(/[a-zA-Z]/g, '').trim(); // Remove OD/BD/TDS etc.
  // split by dash or space
  const parts = cleaned.split(/[- ]+/).filter(Boolean);
  return parts;
};

const getInstructionText = (med) => {
  const parts = getDosageParts(med.dosage);
  const type = med.type ? med.type.charAt(0).toUpperCase() + med.type.slice(1).toLowerCase() : 'Tablet';

  if (parts.length === 0) {
    // Fallback: just combine timing and duration
    const timingPart = med.timing ? med.timing : '';
    const durationPart = med.duration ? `( ${med.duration} )` : '';
    return `${timingPart} ${durationPart}`.trim();
  }

  const timing = (med.timing || '').toLowerCase();
  const isTamil = /[\u0b80-\u0bff]/.test(med.timing || '');

  if (isTamil) {
    const isBeforeFood = timing.includes('முன்') && !timing.includes('படுக்கும்');
    const isAfterFood = timing.includes('பின்');
    const isEmptyStomach = timing.includes('வெறும்');
    const isBedtime = timing.includes('படுக்கும்');

    let suffix = 'உணவுக்கு பின்';
    if (isBeforeFood) suffix = 'உணவுக்கு முன்';
    else if (isEmptyStomach) suffix = 'வெறும் வயிற்றில்';
    else if (isBedtime) suffix = 'படுக்கும் முன்';

    const slotNames = parts.length === 4
      ? [
        isEmptyStomach ? 'காலை வெறும் வயிற்றில்' : `காலை ${suffix}`,
        isEmptyStomach ? 'மதியம் வெறும் வயிற்றில்' : `மதியம் ${suffix}`,
        'மாலை',
        isBedtime ? 'படுக்கும் முன்' : `இரவு ${suffix}`
      ]
      : [
        isEmptyStomach ? 'காலை வெறும் வயிற்றில்' : `காலை ${suffix}`,
        isEmptyStomach ? 'மதியம் வெறும் வயிற்றில்' : `மதியம் ${suffix}`,
        isBedtime ? 'படுக்கும் முன்' : `இரவு ${suffix}`
      ];

    const lines = [];
    parts.forEach((qty, idx) => {
      const qtyVal = parseFloat(qty);
      if (qtyVal > 0 && idx < slotNames.length) {
        const qtyDisplay = qty === '0.5' ? '1/2' : qty === '0.25' ? '1/4' : qty === '0.75' ? '3/4' : qty;

        let tamilType = type;
        const lowType = type.toLowerCase();
        if (lowType.startsWith('tab')) tamilType = 'மாத்திரை';
        else if (lowType.startsWith('cap')) tamilType = 'மாத்திரை';
        else if (lowType.startsWith('syr') || lowType.startsWith('syp')) tamilType = 'சிரப்';
        else if (lowType.startsWith('inj')) tamilType = 'ஊசி';
        else if (lowType.includes('drop')) tamilType = 'சொட்டு மருந்து';
        else if (lowType.includes('oint') || lowType.includes('gel')) tamilType = 'பூசும் மருந்து';

        lines.push(`${qtyDisplay} ${tamilType} ${slotNames[idx]}`);
      }
    });

    let result = lines.join(' - ');
    if (med.duration) {
      result += `  ( ${med.duration} )`;
    }
    return result;
  } else {
    const isBeforeFood = timing.includes('before');
    const isEmptyStomach = timing.includes('empty');

    let timingPrefix = 'After';
    if (isBeforeFood || isEmptyStomach) timingPrefix = 'Before';

    const slotNames = parts.length === 4
      ? [
        `${timingPrefix} Breakfast`,
        `${timingPrefix} Lunch`,
        'Evening',
        `${timingPrefix} Dinner`
      ]
      : [
        `${timingPrefix} Breakfast`,
        `${timingPrefix} Lunch`,
        `${timingPrefix} Dinner`
      ];

    const lines = [];
    parts.forEach((qty, idx) => {
      const qtyVal = parseFloat(qty);
      if (qtyVal > 0 && idx < slotNames.length) {
        let timeText = slotNames[idx];
        if (isEmptyStomach && idx === 0) timeText = 'on Empty Stomach';

        const qtyDisplay = qty === '0.5' ? '1/2' : qty === '0.25' ? '1/4' : qty === '0.75' ? '3/4' : qty;
        lines.push(`${qtyDisplay} ${type} ${timeText}`);
      }
    });

    let result = lines.join(' - ');
    if (med.duration) {
      result += `  ( ${med.duration} )`;
    }
    return result;
  }
};

const PrescriptionPreview = ({ data }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
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
        padding: '0 1.2cm 0.5cm 1.2cm',
        background: 'white',
        width: '210mm',
        minHeight: '297mm',
        margin: '0 auto',
        color: '#000',
        fontFamily: "'Inter', sans-serif",
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
              padding-bottom: 0.5cm !important;
              box-shadow: none !important;
              width: 210mm !important;
              min-height: 297mm !important;
            }
            .modal-overlay, .no-print {
              display: none !important;
            }
          }
        `}} />

      {/* ══ SPACER TO START PRINTING AFTER Rx ══ */}
      <div style={{ height: '5.0cm' }}></div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* ══ PATIENT DETAILS BLOCK ══ */}
        <div style={{
          borderTop: '1.2px solid #000',
          borderBottom: '1.2px solid #000',
          padding: '4px 0',
          display: 'grid',
          gridTemplateColumns: '1.25fr 0.75fr',
          gap: '2px 15px',
          fontSize: '9pt',
          lineHeight: '1.3'
        }}>
          <div>
            <span style={{ fontWeight: 600, width: '90px', display: 'inline-block' }}>MRN No</span>
            <span style={{ margin: '0 4px' }}>:</span>
            <span style={{ fontWeight: 700 }}>{data.mrn || '-------'}</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, width: '75px', display: 'inline-block' }}>Date</span>
            <span style={{ margin: '0 4px' }}>:</span>
            <span style={{ fontWeight: 700 }}>{formatDate(data.date)}</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, width: '90px', display: 'inline-block' }}>Patient Name</span>
            <span style={{ margin: '0 4px' }}>:</span>
            <span style={{ fontWeight: 700 }}>{data.patientName ? `${data.patientName.toUpperCase()}${data.age ? `, ${data.age}` : ''}${data.gender ? ` / ${data.gender.toUpperCase()}` : ''}` : '------------------'}</span>
          </div>
          <div></div>
          <div>
            <span style={{ fontWeight: 600, width: '90px', display: 'inline-block' }}>Doctor</span>
            <span style={{ margin: '0 4px' }}>:</span>
            <span style={{ fontWeight: 700 }}>{data.doctorName ? `${data.doctorName.toUpperCase()}${data.doctorQualifications ? ` ${data.doctorQualifications.toUpperCase()}` : ''}` : '------------------'}</span>
          </div>
          <div>
            <span style={{ fontWeight: 600, width: '75px', display: 'inline-block' }}>Department</span>
            <span style={{ margin: '0 4px' }}>:</span>
            <span style={{ fontWeight: 700 }}>{data.doctorRole ? data.doctorRole.toUpperCase() : '-------'}</span>
          </div>
        </div>

        {/* ══ VITALS BAR ══ */}
        {((data.weight || data.bp || data.pulse || data.temp) ? (
          <div style={{
            borderBottom: '1.2px solid #000',
            padding: '4px 0',
            fontSize: '9pt',
            fontWeight: 700,
            textTransform: 'uppercase'
          }}>
            {(() => {
              const vitals = [];
              if (data.weight) vitals.push(`WEIGHT : ${data.weight} kgs`);
              if (data.bp) vitals.push(`BP : ${data.bp} mmHg`);
              if (data.pulse) vitals.push(`PULSE : ${data.pulse} bpm`);
              if (data.temp) vitals.push(`TEMP : ${data.temp} °F`);
              return vitals.join('; ') + ';';
            })()}
          </div>
        ) : null)}

        {/* ══ CLINICAL DETAILS ══ */}
        <div style={{ marginTop: '4pt', display: 'flex', flexDirection: 'column', gap: '2pt' }}>
          {data.complaints && (
            <div style={{ fontSize: '10pt' }}>
              <span style={{ fontWeight: 800, textDecoration: 'underline' }}>CHIEF COMPLAINTS:</span>
              <div style={{ marginTop: '1pt', paddingLeft: '5pt', fontWeight: 600 }}>
                {data.complaints.split('\n').map((line, i) => (
                  <div key={i} style={{ marginBottom: '1pt' }}>• {line}</div>
                ))}
              </div>
            </div>
          )}

          {data.diagnosis && (
            <div style={{ fontSize: '10pt' }}>
              <span style={{ fontWeight: 800, textDecoration: 'underline' }}>DIAGNOSIS:</span>
              <div style={{ marginTop: '1pt', paddingLeft: '5pt', fontWeight: 600 }}>
                {data.diagnosis.split('\n').map((line, i) => (
                  <div key={i} style={{ marginBottom: '1pt' }}>• {line}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ══ RX SYMBOL ══ */}
        <div style={{ marginTop: '4pt', fontSize: '16pt', fontWeight: 900, fontFamily: 'serif' }}>Rx</div>

        {/* ══ MEDICINES LIST ══ */}
        <div style={{ flex: 1, marginTop: '3pt' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6pt' }}>
            {data.medicines && data.medicines.map((med, index) => {
              if (!med) return null;
              if (!med.name && !med.dosage && !med.timing) return null;

              const parts = getDosageParts(med.dosage);
              const formattedDosage = parts.length > 0 ? parts.join(' - ') : med.dosage || '';

              return (
                <div key={index} style={{ fontSize: '10.5pt', lineHeight: '1.4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontWeight: 700 }}>
                      {index + 1}) &nbsp; {med.name ? med.name.toUpperCase() : '---'}
                      {med.type && <span style={{ fontWeight: 600, color: '#334155', marginLeft: '4px' }}>[{med.type.charAt(0).toUpperCase() + med.type.slice(1).toLowerCase()}]</span>}
                    </div>
                  </div>

                  <div style={{
                    paddingLeft: '20px',
                    color: '#334155',
                    fontSize: '9.5pt',
                    marginTop: '2px',
                    fontWeight: 600,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    {(() => {
                      const elements = [];
                      if (med.dosage) {
                        elements.push(
                          <span style={{ color: '#dc2626', fontWeight: 800 }}>{formattedDosage}</span>
                        );
                      }
                      if (med.timing) {
                        elements.push(<span>{med.timing}</span>);
                      }
                      if (med.schedule) {
                        elements.push(<span>{med.schedule}</span>);
                      }
                      if (med.duration) {
                        elements.push(<span>{med.duration}</span>);
                      }
                      if (med.qty) {
                        elements.push(<span style={{ fontWeight: 800 }}>Qty: {med.qty}</span>);
                      }

                      return elements.reduce((acc, el, idx) => {
                        if (idx > 0) {
                          acc.push(<span key={`sep-${idx}`} style={{ color: '#cbd5e1', fontWeight: 'normal' }}>|</span>);
                        }
                        acc.push(React.cloneElement(el, { key: `item-${idx}` }));
                        return acc;
                      }, []);
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══ ADVICE SECTION ══ */}
        {data.advice && (
          <div style={{ marginTop: '6pt', fontSize: '10pt' }}>
            <span style={{ fontWeight: 800, textDecoration: 'underline' }}>ADVICE / INSTRUCTIONS:</span>
            <div style={{ marginTop: '1pt', paddingLeft: '5pt', fontWeight: 600 }}>
              {data.advice.split('\n').map((line, i) => (
                <div key={i} style={{ marginBottom: '1pt' }}>• {line}</div>
              ))}
            </div>
          </div>
        )}

        {/* ══ BOTTOM SECTION: REVIEW DATE & SIGNATURE ══ */}
        <div style={{
          marginTop: 'auto',
          paddingBottom: '0.4cm',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          alignSelf: 'stretch'
        }}>
          <div>
            {data.followUp && (
              <div style={{
                fontSize: '9.5pt',
                fontWeight: 800,
                color: '#c0392b',
                textTransform: 'uppercase',
                alignSelf: 'flex-start'
              }}>
                அடுத்த பரிசோதனை நாள் (Review): {formatDate(data.followUp)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: '1.3', paddingRight: '1cm' }}>
            <div style={{ fontWeight: 700, color: '#000', fontSize: '10pt', textTransform: 'uppercase' }}>
              {data.doctorName ? `${data.doctorName.toUpperCase()}${data.doctorQualifications ? ` ${data.doctorQualifications.toUpperCase()}` : ''}` : 'DR. ------------------'}
            </div>
            {data.doctorRegNo && (
              <div style={{ fontSize: '8.5pt', color: '#555', fontWeight: 600 }}>
                Reg. No.{data.doctorRegNo}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrescriptionPreview;
