import React, { useState } from 'react'
import Header from './components/Header'
import PrescriptionForm from './components/PrescriptionForm'
import PrescriptionPreview from './components/PrescriptionPreview'

function App() {
  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'preview'

  // Load saved doctors from localStorage on initial render
  const [savedDoctors, setSavedDoctors] = useState(() => {
    const saved = localStorage.getItem('savedDoctors');
    return saved ? JSON.parse(saved) : [
      {
        name: 'Dr. S. BASHEER AHMED',
        qualifications: 'MS (ORTHO)',
        role: 'Consultant Trauma, Joint Replacement & Spine Surgeon',
        regNo: '93179'
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('savedDoctors', JSON.stringify(savedDoctors));
  }, [savedDoctors]);

  const [data, setData] = useState({
    clinicName: 'THULIR MULTISPECIALITY HOSPITAL',
    phone1: '04366 222108, 70949 19494, 70949 29494',
    mrn: '07042',
    visitNo: 'OP/25011883',
    date: '2025-07-28',
    patientName: 'Mrs. S MAHABOOBA BEEVI',
    age: '61',
    gender: 'Y/F',
    phone: '9659731383',
    complaints: 'KNEE PAIN\nLEFT SIDE 10 DAYS',
    diagnosis: '',
    medicines: [{ type: 'TABLETS', name: 'HYAL ORAL', composition: 'SODIUM HYALURONATE 20 mg', dosage: '1-0-1', timing: 'உணவுக்குப் பிறகு', schedule: 'தினசரி', duration: '30 நாட்கள்', remarks: '', qty: '60' }],
    advice: 'PHYSIO ADVISED\nHOT WATER MASSAGE THRICE\nQ STRENGTHENING EXERCISES\nWAX MOBILSATIO, IFT PHYSIO 7 DAYS',
    followUp: '2025-08-27',
    doctorName: savedDoctors[0]?.name || '',
    doctorQualifications: savedDoctors[0]?.qualifications || '',
    doctorRole: savedDoctors[0]?.role || '',
    doctorRegNo: savedDoctors[0]?.regNo || ''
  });

  const handleDoctorSelect = (doctor) => {
    setData(prev => ({
      ...prev,
      doctorName: doctor.name,
      doctorQualifications: doctor.qualifications,
      doctorRole: doctor.role,
      doctorRegNo: doctor.regNo || ''
    }));
  };

  const handleSaveDoctor = (newDoctor) => {
    setSavedDoctors(prev => {
      if (prev.find(doc => doc.name === newDoctor.name)) return prev;
      return [...prev, newDoctor];
    });
  };

  const handleDeleteDoctor = (doctorToDelete) => {
    setSavedDoctors(prev => prev.filter(doc => doc.name !== doctorToDelete.name));
  };

  const handlePrint = () => {
    const paperEl = document.getElementById('prescription-paper');
    if (!paperEl) { alert('No prescription to print.'); return; }

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Prescription Preview</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;900&family=Inter:wght@400;600;700&display=swap" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: #e8edf2;
              font-family: 'Noto Sans Tamil', 'Latha', 'Arial Unicode MS', 'Inter', sans-serif;
              padding: 0;
            }
            /* Sticky toolbar */
            #print-toolbar {
              position: sticky;
              top: 0;
              z-index: 100;
              background: #1565C0;
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            #print-toolbar span {
              color: white;
              font-family: 'Inter', sans-serif;
              font-size: 14px;
              font-weight: 600;
            }
            #print-toolbar button {
              background: white;
              color: #1565C0;
              border: none;
              padding: 8px 22px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 700;
              cursor: pointer;
              font-family: 'Inter', sans-serif;
            }
            #print-toolbar button:hover { background: #e3f2fd; }
            /* Paper wrapper */
            #paper-wrapper {
              display: flex;
              justify-content: center;
              padding: 30px 20px 40px;
            }
            #prescription-paper {
              width: 210mm;
              min-height: 297mm;
              background: white;
              box-shadow: 0 4px 30px rgba(0,0,0,0.18);
              padding: 0.8cm 1.2cm 1cm 1.2cm;
            }
            @page { size: A4 portrait; margin: 0; }
            @media print {
              #print-toolbar { display: none !important; }
              body { background: white !important; padding: 0 !important; }
              #paper-wrapper { padding: 0 !important; }
              #prescription-paper {
                width: 210mm !important;
                min-height: 297mm !important;
                box-shadow: none !important;
                padding: 0.8cm 1.2cm 1cm 1.2cm !important;
              }
            }
          </style>
        </head>
        <body>
          <div id="print-toolbar">
            <span>📄 Prescription Preview — Scroll to review, then print</span>
            <button onclick="window.print()">🖨 Print</button>
          </div>
          <div id="paper-wrapper">
            ${paperEl.outerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    const paperEl = document.getElementById('prescription-paper');
    if (!paperEl) { alert('No prescription to share.'); return; }

    const shareBtn = document.activeElement;
    const originalText = shareBtn?.innerText || 'Share';
    if (shareBtn) shareBtn.innerText = 'Generating PDF...';

    const opt = {
      margin: 0,
      filename: `Prescription_${data.patientName || 'Patient'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const paper = clonedDoc.getElementById('prescription-paper');
          if (paper) {
            // Recursively ensure all parents are visible in the clone
            let curr = paper;
            while (curr && curr.style && curr !== clonedDoc.body) {
              curr.style.display = 'block';
              curr.style.visibility = 'visible';
              curr.style.position = 'static';
              curr.style.transform = 'none';
              curr.style.opacity = '1';
              curr.style.margin = '0';
              curr.style.padding = '0';
              curr.style.height = 'auto';
              curr.style.width = 'auto';
              curr.style.overflow = 'visible';
              curr = curr.parentElement;
            }
            // Add padding back to paper specifically
            paper.style.padding = '0.8cm 1.2cm 1cm 1.2cm';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      const worker = html2pdf().set(opt).from(paperEl);
      const pdfBlob = await worker.output('blob');
      const pdfFile = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Prescription - ${data.patientName}`,
          text: `Prescription for ${data.patientName}`,
        });
      } else {
        await worker.save();
        setTimeout(() => alert('Sharing is not supported on this browser. The PDF has been downloaded instead.'), 500);
      }
    } catch (err) {
      console.error('PDF Generation/Share failed', err);
      alert('Could not generate PDF. Please use the Print button instead.');
    } finally {
      if (shareBtn) shareBtn.innerText = originalText;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* ── Mobile Tab Bar ── */}
      <div className="mobile-tabs no-print">
        <button
          className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Form
        </button>
        <button
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Preview
        </button>
      </div>

      <main className="app-main">
        {/* Left Side: Form */}
        <section className={`form-section no-print ${activeTab === 'form' ? 'tab-active' : 'tab-hidden'}`}>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem' }}>Create Prescription</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleShare} className="print-btn" style={{ background: '#43a047' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.41" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
              <button onClick={handlePrint} className="print-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
                Print
              </button>
            </div>
          </div>
          <PrescriptionForm
            data={data}
            setData={setData}
            savedDoctors={savedDoctors}
            onDoctorSelect={handleDoctorSelect}
            onSaveDoctor={handleSaveDoctor}
            onDeleteDoctor={handleDeleteDoctor}
          />
        </section>

        {/* Right Side: Live Preview */}
        <section className={`preview-section ${activeTab === 'preview' ? 'tab-active' : 'tab-hidden'}`}>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="no-print" style={{ fontSize: '1.25rem' }}>Live Preview</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleShare} className="print-btn no-print" style={{ background: '#43a047' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.41" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share
              </button>
              <button onClick={handlePrint} className="print-btn no-print">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" />
                </svg>
                Print
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <PrescriptionPreview data={data} />
          </div>
        </section>
      </main>

      <footer className="no-print" style={{
        padding: '1.5rem 2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        borderTop: '1px solid var(--border)',
        marginTop: '2rem'
      }}>
        <p style={{ margin: 0 }}>© 2026 Guardian Pharmacy & Clinic. All rights reserved.</p>
        <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>
          Developed by <a href="mailto:noorulmuhsinbca@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Muhsin</a>
        </p>
      </footer>
    </div>
  )
}

export default App
