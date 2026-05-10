import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import Header from './components/Header.jsx'
import PrescriptionForm from './components/PrescriptionForm.jsx'
import PrescriptionPreview from './components/PrescriptionPreview.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'

function App() {
  const [activeTab, setActiveTab] = useState('form')
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('is_admin_v2') === 'true')

  // Load clinic settings
  const [clinicSettings, setClinicSettings] = useState(() => {
    const saved = localStorage.getItem('admin_clinic_settings')
    return saved ? JSON.parse(saved) : {
      name: 'THULIR MULTISPECIALITY HOSPITAL',
      phone: '04366 222108, 70949 19494, 70949 29494'
    }
  })

  // Load Admin Medicines for Autocomplete
  const [adminMedicines, setAdminMedicines] = useState([])
  useEffect(() => {
    const savedMeds = localStorage.getItem('admin_medicines')
    if (savedMeds) {
      setAdminMedicines(JSON.parse(savedMeds))
    } else {
      import('./data/products.json').then(data => {
        setAdminMedicines(data.default)
      }).catch(() => setAdminMedicines([]))
    }
  }, [isAdmin]) // Reload when admin changes something

  // Load saved doctors
  const [savedDoctors, setSavedDoctors] = useState(() => {
    const saved = localStorage.getItem('savedDoctors_v2')
    return saved ? JSON.parse(saved) : [
      {
        name: 'Dr. S. BASHEER AHMED',
        qualifications: 'MS (ORTHO)',
        role: 'Consultant Trauma, Joint Replacement & Spine Surgeon',
        regNo: '93179'
      }
    ]
  })

  const [data, setData] = useState(() => {
    const defaults = {
      clinicName: clinicSettings.name,
      phone1: clinicSettings.phone,
      mrn: '',
      visitNo: '',
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      age: '',
      gender: '',
      phone: '',
      complaints: '',
      diagnosis: '',
      medicines: [{ id: Math.random().toString(36).substr(2, 9), type: '', name: '', composition: '', dosage: '', timing: '', schedule: '', duration: '', qty: '', showDosageTips: false, showTimingTips: false, showDurationTips: false, showScheduleTips: false }],
      advice: '',
      followUp: '',
      weight: '',
      bp: '',
      pulse: '',
      temp: '',
      doctorName: savedDoctors[0]?.name || '',
      doctorQualifications: savedDoctors[0]?.qualifications || '',
      doctorRole: savedDoctors[0]?.role || '',
      doctorRegNo: savedDoctors[0]?.regNo || ''
    }

    const saved = localStorage.getItem('currentPrescription_v2')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        const merged = { ...defaults, ...parsed }
        if (Array.isArray(merged.medicines)) {
          merged.medicines = merged.medicines.filter(m => m !== null && typeof m === 'object')
        } else {
          merged.medicines = defaults.medicines
        }
        return merged
      } catch (e) {
        console.error("Failed to parse saved prescription", e)
      }
    }
    return defaults
  })

  // Update data when clinic settings change
  useEffect(() => {
    setData(prev => ({
      ...prev,
      clinicName: clinicSettings.name,
      phone1: clinicSettings.phone
    }))
  }, [clinicSettings])

  useEffect(() => {
    localStorage.setItem('savedDoctors_v2', JSON.stringify(savedDoctors))
  }, [savedDoctors])

  useEffect(() => {
    localStorage.setItem('currentPrescription_v2', JSON.stringify(data))
  }, [data])

  useEffect(() => {
    localStorage.setItem('is_admin_v2', isAdmin)
  }, [isAdmin])

  const handleLogin = (status) => setIsAdmin(status)
  const handleLogout = () => {
    setIsAdmin(false)
    localStorage.removeItem('is_admin_v2')
  }

  const handleDoctorSelect = (doctor) => {
    setData(prev => ({
      ...prev,
      doctorName: doctor.name,
      doctorQualifications: doctor.qualifications,
      doctorRole: doctor.role,
      doctorRegNo: doctor.regNo || ''
    }))
  }

  const handleSaveDoctor = (newDoctor) => {
    setSavedDoctors(prev => {
      if (prev.find(doc => doc.name === newDoctor.name)) return prev
      return [...prev, newDoctor]
    })
  }

  const handleDeleteDoctor = (doctorToDelete) => {
    setSavedDoctors(prev => prev.filter(doc => doc.name !== doctorToDelete.name))
  }

  const handlePrint = () => {
    const paperEl = document.getElementById('prescription-paper')
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
            body { background: #e8edf2; font-family: 'Noto Sans Tamil', sans-serif; }
            #print-toolbar { position: sticky; top: 0; z-index: 100; background: #1565C0; display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; color: white; }
            #print-toolbar button { background: white; color: #1565C0; border: none; padding: 8px 22px; border-radius: 6px; font-weight: 700; cursor: pointer; }
            #paper-wrapper { display: flex; justify-content: center; padding: 30px; }
            #prescription-paper { width: 210mm; min-height: 297mm; background: white; padding: 0.8cm 1.2cm; box-shadow: 0 4px 30px rgba(0,0,0,0.1); }
            @media print { #print-toolbar { display: none !important; } body { background: white !important; } #paper-wrapper { padding: 0 !important; } }
          </style>
        </head>
        <body>
          <div id="print-toolbar"><span>📄 Prescription Preview</span><button onclick="window.print()">🖨 Print</button></div>
          <div id="paper-wrapper">${paperEl.outerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const handleShare = async () => {
    const paperEl = document.getElementById('prescription-paper')
    if (!paperEl) { alert('No prescription to share.'); return; }
    if (typeof window.html2pdf === 'undefined') {
      alert('PDF library is not loaded yet.');
      return;
    }
    const opt = { margin: 0, filename: `Prescription_${data.patientName}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    try {
      const worker = window.html2pdf().set(opt).from(paperEl);
      const pdfBlob = await worker.output('blob');
      const pdfFile = new File([pdfBlob], opt.filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({ files: [pdfFile], title: `Prescription - ${data.patientName}` });
      } else { await worker.save(); }
    } catch (err) { console.error(err); alert('Share failed.'); }
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AdminLogin onLogin={handleLogin} />} />
        <Route 
          path="/admin" 
          element={isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header />

            {/* Mobile Tab Bar */}
            <div className="mobile-tabs no-print">
              <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Form
              </button>
              <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview
              </button>
            </div>

            <main className="app-main">
              <section className={`form-section no-print ${activeTab === 'form' ? 'tab-active' : 'tab-hidden'}`}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.25rem' }}>Create Prescription</h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleShare} className="print-btn" style={{ background: '#43a047' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.41" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share
                    </button>
                    <button onClick={handlePrint} className="print-btn">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                      Print
                    </button>
                  </div>
                </div>
                <PrescriptionForm
                  data={data}
                  setData={setData}
                  savedDoctors={savedDoctors}
                  adminMedicines={adminMedicines}
                  onDoctorSelect={handleDoctorSelect}
                  onSaveDoctor={handleSaveDoctor}
                  onDeleteDoctor={handleDeleteDoctor}
                />
              </section>

              <section className={`preview-section ${activeTab === 'preview' ? 'tab-active' : 'tab-hidden'}`}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 className="no-print" style={{ fontSize: '1.25rem' }}>Live Preview</h2>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleShare} className="print-btn no-print" style={{ background: '#43a047' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.41" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                      Share
                    </button>
                    <button onClick={handlePrint} className="print-btn no-print">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                      Print
                    </button>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <PrescriptionPreview data={data} />
                </div>
              </section>
            </main>

            <footer className="no-print" style={{ padding: '1.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
              <p>© 2026 Guardian Pharmacy & Clinic. All rights reserved.</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>Developed by <a href="mailto:noorulmuhsinbca@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Muhsin</a></p>
            </footer>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App
