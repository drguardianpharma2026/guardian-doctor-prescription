import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import Header from './components/Header.jsx'
import PrescriptionForm from './components/PrescriptionForm.jsx'
import PrescriptionPreview from './components/PrescriptionPreview.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import UserLogin from './components/UserLogin.jsx'
import UserSignup from './components/UserSignup.jsx'
import TodayOP from './components/TodayOP.jsx'
import StaffDashboard from './components/StaffDashboard.jsx'
import { databaseService } from './services/databaseService.js'

function App() {
  const [activeTab, setActiveTab] = useState('form')
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('is_admin_v2') === 'true')
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(() => localStorage.getItem('is_user_authenticated') === 'true')

  // Load clinic settings
  const [clinicSettings, setClinicSettings] = useState({
    name: 'THULIR MULTISPECIALITY HOSPITAL',
    phone: '04366 222108, 70949 19494, 70949 29494'
  })

  // Load Admin Medicines for Autocomplete
  const [adminMedicines, setAdminMedicines] = useState([])

  // Load saved doctors
  const [savedDoctors, setSavedDoctors] = useState([])
  const [todayOPPatients, setTodayOPPatients] = useState([])
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const [data, setData] = useState({
    clinicName: '',
    phone1: '',
    mrn: '',
    visitNo: '',
    date: new Date().toLocaleDateString('en-CA'),
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
    doctorName: '',
    doctorQualifications: '',
    doctorRole: '',
    doctorRegNo: '',
    rxId: null
  })

  // Fetch all master data from Neon on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const settings = await databaseService.getSettings();
        if (settings) setClinicSettings(settings);

        const dbDoctors = await databaseService.getSavedDoctors();
        const dbUsers = await databaseService.getUsers();

        // We now prioritize doctors with accounts (dbUsers)
        const activeDoctorAccounts = (dbUsers || []).map(u => ({
          name: u.name,
          qualifications: u.qualification || '',
          role: u.consultant || '',
          regNo: u.reg_no || u.regNo || ''
        }));

        // Filter out specific placeholder names
        const finalDoctors = activeDoctorAccounts.filter(d =>
          d.name && !d.name.toUpperCase().includes('MUHSIN')
        );

        if (finalDoctors.length > 0) {
          setSavedDoctors(finalDoctors);
          // Set initial doctor if not set
          setData(prev => ({
            ...prev,
            doctorName: finalDoctors[0].name,
            doctorQualifications: finalDoctors[0].qualifications,
            doctorRole: finalDoctors[0].role,
            doctorRegNo: finalDoctors[0].regNo || ''
          }));
        }


        const medicines = await databaseService.getMedicines();
        if (medicines) {
          setAdminMedicines(medicines);
        }

        // Pre-fill next MRN if empty
        const patients = await databaseService.getAllPatients();
        if (patients && patients.length > 0) {
          setData(prev => {
            if (prev.mrn) return prev;
            const numericMRNs = patients
              .map(p => {
                const trimmed = p.mrn?.trim() || '';
                if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
                return NaN;
              })
              .filter(num => !isNaN(num) && num >= 0);

            const nextMRN = numericMRNs.length > 0 ? (Math.max(...numericMRNs) + 1).toString() : '1';
            return { ...prev, mrn: nextMRN };
          });
        }

        // Fetch OP patients for the currently selected date
        const queryDate = data.date || new Date().toLocaleDateString('en-CA');
        const [prescriptions, allPatients] = await Promise.all([
          databaseService.getPrescriptions(null, queryDate),
          databaseService.getAllPatients()
        ]);

        const mergedMap = new Map();

        // 1. Add all patients registered today (Waiting List)
        const patientsToday = allPatients.filter(p =>
          p.date === queryDate || (p.registration_date && p.registration_date.startsWith(queryDate))
        );
        patientsToday.forEach(p => {
          mergedMap.set(String(p.mrn).trim(), {
            ...p,
            name: p.name || 'Unknown Patient'
          });
        });

        // 2. Wrap prescriptions (Active/Completed)
        if (prescriptions) {
          prescriptions.forEach(rx => {
            const mrnKey = String(rx.mrn).trim();
            const existingPatient = mergedMap.get(mrnKey);
            mergedMap.set(mrnKey, {
              ...(existingPatient || {}),
              ...rx,
              rx_id: rx.id,
              rx_date: rx.date,
              name: existingPatient?.name || rx.patient_name || 'Unknown Patient'
            });
          });
        }

        setTodayOPPatients(Array.from(mergedMap.values()));
      } catch (err) {
        console.error('Failed to fetch master data:', err);
      }
    };
    fetchMasterData();

    // Listen for sync events (e.g. from TodayOP or Admin tabs)
    const syncChannel = new BroadcastChannel('nexusrx_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'refresh') fetchMasterData();
    };

    // Polling as a secondary "live" automation (every 20s)
    const poll = setInterval(fetchMasterData, 20000);

    return () => {
      syncChannel.close();
      clearInterval(poll);
    };
  }, [data.date]); // Re-fetch when the chosen date changes

  // Update data when clinic settings change
  useEffect(() => {
    setData(prev => ({
      ...prev,
      clinicName: clinicSettings.name,
      phone1: clinicSettings.phone
    }))
  }, [clinicSettings])

  useEffect(() => {
    localStorage.setItem('is_admin_v2', isAdmin)
  }, [isAdmin])

  useEffect(() => {
    localStorage.setItem('is_user_authenticated', isUserAuthenticated)

    // Auto-fill doctor info from logged-in account
    if (isUserAuthenticated) {
      const loggedUser = localStorage.getItem('logged_in_user')
      if (loggedUser) {
        const user = JSON.parse(loggedUser)

        setData(prev => ({
          ...prev,
          doctorName: user.name || prev.doctorName,
          doctorQualifications: user.qualification || prev.doctorQualifications,
          doctorRole: user.consultant || prev.doctorRole,
          doctorRegNo: user.reg_no || user.regNo || prev.doctorRegNo
        }))

        // Ensure logged in doctor is in the list
        setSavedDoctors(prev => {
          if (prev.find(doc => doc.name === user.name)) return prev
          const newDoc = {
            name: user.name,
            qualifications: user.qualification || '',
            role: user.consultant || '',
            reg_no: user.reg_no || user.regNo || ''
          };
          // Also save this doctor to DB so it persists
          databaseService.saveDoctor(newDoc).catch(console.error);
          return [newDoc, ...prev]
        })
      }
    }
  }, [isUserAuthenticated])

  const handleLogin = (status) => setIsAdmin(status)
  const handleLogout = () => {
    setIsAdmin(false)
    localStorage.removeItem('is_admin_v2')
  }

  const handleUserLogin = (status) => setIsUserAuthenticated(status)
  const handleUserLogout = () => {
    setIsUserAuthenticated(false)
    localStorage.removeItem('is_user_authenticated')
    localStorage.removeItem('logged_in_user')
  }

  const handleDoctorSelect = (doctor) => {
    setData(prev => ({
      ...prev,
      doctorName: doctor.name,
      doctorQualifications: doctor.qualifications,
      doctorRole: doctor.role,
      doctorRegNo: doctor.reg_no || doctor.regNo || ''
    }))
  }

  const handleSaveDoctor = async (newDoctor) => {
    setSavedDoctors(prev => {
      if (prev.find(doc => doc.name === newDoctor.name)) return prev
      return [...prev, newDoctor]
    })
    try {
      await databaseService.saveDoctor(newDoctor);
    } catch (err) {
      console.error('Failed to save doctor to DB:', err);
    }
  }

  const handleDeleteDoctor = async (doctorToDelete) => {
    setSavedDoctors(prev => prev.filter(doc => doc.name !== doctorToDelete.name))
    try {
      await databaseService.deleteDoctor(doctorToDelete.name);
    } catch (err) {
      console.error('Failed to delete doctor from DB:', err);
    }
  }

  const handleAutoSave = async (isManual = false) => {
    if (data.mrn) {
      setIsSyncing(true);
      try {
        // Always save patient demographics
        await databaseService.savePatient(data);

        // Only save prescription if there is actual clinical content
        const hasMedicines = (data.medicines || []).some(m => m.name && m.name.trim() !== '');
        const hasClinicalContent = data.diagnosis?.trim() || data.complaints?.trim() || hasMedicines;

        if (hasClinicalContent) {
          const savedRx = await databaseService.savePrescription({ ...data, id: data.rxId });

          // CRITICAL: Update the rxId in state so subsequent saves/prints update this record
          if (savedRx && savedRx.id) {
            setData(prev => ({ ...prev, rxId: savedRx.id }));
          }
        } else if (isManual) {
          alert('Please fill in at least a diagnosis, complaints, or medicines before saving a prescription.');
          setIsSyncing(false);
          return;
        }

        // Live automation pulse
        new BroadcastChannel('nexusrx_sync').postMessage('refresh');

        if (isManual) {
          alert('Saved to Neon Database successfully!');
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
        if (isManual) {
          alert(`Failed to save to database: ${err.message}`);
        }
      } finally {
        setIsSyncing(false);
      }
    } else if (isManual) {
      alert('Please enter a Patient ID (MRN) first.');
    }
  }

  const handlePrint = async () => {
    // Open window immediately to avoid popup blocker
    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (!printWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }

    // While window is empty, we can save
    await handleAutoSave();

    const paperEl = document.getElementById('prescription-paper')
    if (!paperEl) {
      printWindow.close();
      alert('No prescription to print.');
      return;
    }

    // Get the styles from the preview component if they are not already in paperEl
    // Since PrescriptionPreview puts a <style> tag as a sibling, we might need to find it
    const previewContainer = paperEl.closest('.preview-scroll-wrapper') || paperEl.parentElement;
    const extraStyles = previewContainer ? Array.from(previewContainer.querySelectorAll('style')).map(s => s.innerHTML).join('\n') : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Prescription - ${data.patientName || 'Preview'}</title>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;900&family=Inter:wght@400;600;700&display=swap" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { background: #f1f5f9; font-family: 'Inter', 'Noto Sans Tamil', sans-serif; display: flex; flex-direction: column; align-items: center; }
            #print-toolbar { 
              position: sticky; top: 0; z-index: 1000; width: 100%; 
              background: #1e3a5f; display: flex; align-items: center; 
              justify-content: space-between; padding: 12px 24px; color: white; 
              box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: sans-serif;
            }
            #print-toolbar button { 
              background: #10b981; color: white; border: none; 
              padding: 10px 24px; border-radius: 8px; font-weight: 700; 
              cursor: pointer; font-size: 14px; transition: all 0.2s;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            #print-toolbar button:hover { background: #059669; transform: translateY(-1px); }
            #paper-wrapper { padding: 40px 20px; display: flex; justify-content: center; width: 100%; }
            #prescription-paper { 
              width: 210mm; min-height: 297mm; background: white; 
              box-shadow: 0 10px 40px rgba(0,0,0,0.15); border-radius: 4px;
            }
            ${extraStyles}
            @media print { 
              #print-toolbar { display: none !important; } 
              body { background: white !important; padding: 0 !important; } 
              #paper-wrapper { padding: 0 !important; display: block !important; }
              #prescription-paper { box-shadow: none !important; border: none !important; border-radius: 0 !important; width: 210mm !important; }
            }
          </style>
        </head>
        <body>
          <div id="print-toolbar">
            <div style="display:flex; align-items:center; gap:10px">
              <span style="font-size:20px">🩺</span>
              <span style="font-weight:700; font-size:16px">Prescription Preview</span>
            </div>
            <button onclick="window.print()">🖨 Print Prescription</button>
          </div>
          <div id="paper-wrapper">
            ${paperEl.outerHTML}
          </div>
          <script>
            // Auto-print focus
            window.focus();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const handleShare = async () => {
    await handleAutoSave();
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
        <Route path="/login" element={<UserLogin onLogin={handleUserLogin} />} />
        <Route path="/signup" element={<UserSignup onSignup={handleUserLogin} />} />
        <Route path="/admin-login" element={<AdminLogin onLogin={handleLogin} />} />
        <Route path="/admin" element={isAdmin ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/admin-login" />} />
        <Route path="/today-op" element={isAdmin ? <TodayOP /> : <Navigate to="/admin-login" />} />
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/" element={
          isUserAuthenticated ? (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <Header onLogout={handleUserLogout} />

              {/* Mobile Tab Bar (Moved to Bottom for Mobile App Feel) */}
              <div className="mobile-tabs no-print">
                <button className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`} onClick={() => setActiveTab('form')}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  <span>Form</span>
                </button>
                <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  <span>Preview</span>
                </button>
              </div>

              <main className="app-main" style={{
                gridTemplateColumns: isSidebarVisible ? '280px 1.2fr 0.8fr' : '1.2fr 0.8fr',
                maxWidth: '100%',
                padding: '1rem'
              }}>
                {/* ── Today's OP Sidebar ── */}
                <aside className={`sidebar-section desktop-only ${!isSidebarVisible ? 'tab-hidden' : ''}`} style={{
                  background: 'white',
                  borderRadius: '20px',
                  border: '1px solid var(--border)',
                  padding: '1.25rem',
                  height: 'calc(100vh - var(--header-height) - 40px)',
                  position: 'sticky',
                  top: 'calc(var(--header-height) + 20px)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(() => {
                        const today = new Date().toLocaleDateString('en-CA');
                        if (data.date === today) return "Today's";
                        const d = new Date(data.date);
                        return <span style={{ color: '#2563eb', fontWeight: 900 }}>{`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`}</span>;
                      })()} OP List
                      <span style={{
                        fontSize: '0.65rem', background: '#ecfdf5', color: '#059669',
                        padding: '2px 8px', borderRadius: '20px', display: 'inline-flex',
                        alignItems: 'center', gap: '4px', border: '1px solid #10b981'
                      }}>
                        <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                        {data.date === new Date().toLocaleDateString('en-CA') ? 'LIVE' : 'VIEWING'}
                      </span>
                    </h3>
                    <button onClick={() => setIsSidebarVisible(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                    {todayOPPatients.length === 0 ? (
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', marginTop: '2rem' }}>No patients registered today.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {todayOPPatients.map(p => (
                          <button
                            key={p.rx_id || p.mrn}
                            onClick={async () => {
                              setIsSyncing(true);
                              try {
                                // 1. Prepare base data from the patient object
                                let fullData = {
                                  ...data, // Keep doctor info
                                  mrn: p.mrn,
                                  patientName: p.name || p.patient_name || '',
                                  age: p.age || '',
                                  gender: p.sex || '',
                                  phone: p.phone || '',
                                  weight: p.last_weight || '',
                                  bp: p.last_bp || '',
                                  pulse: p.last_pulse || '',
                                  temp: p.last_temp || '',
                                  rxId: p.rx_id || null,
                                  // Reset clinical fields for safety until loaded
                                  complaints: '',
                                  diagnosis: '',
                                  medicines: [{ id: Math.random().toString(36).substr(2, 9), type: '', name: '', composition: '', dosage: '', timing: '', schedule: '', duration: '', qty: '' }],
                                  advice: '',
                                  followUp: ''
                                };

                                // 2. If there's an rx_id, fetch the full prescription details
                                if (p.rx_id) {
                                  const rxArr = await databaseService.getPrescriptions(null, null, p.rx_id);
                                  if (rxArr && rxArr.length > 0) {
                                    const rx = rxArr[0];
                                    let meds = [];
                                    try { meds = JSON.parse(rx.medicines || '[]'); } catch (e) { }
                                    let vitals = {};
                                    try { vitals = JSON.parse(rx.vitals || '{}'); } catch (e) { }

                                    fullData = {
                                      ...fullData,
                                      complaints: rx.complaints || '',
                                      diagnosis: rx.diagnosis || '',
                                      medicines: meds.length > 0 ? meds : fullData.medicines,
                                      advice: rx.advice || '',
                                      followUp: rx.follow_up || '',
                                      doctorName: rx.doctor_name || fullData.doctorName,
                                      doctorRegNo: rx.doctor_reg_no || fullData.doctorRegNo,
                                      visitNo: rx.visit_no || fullData.visitNo,
                                      weight: vitals.weight || fullData.weight,
                                      bp: vitals.bp || fullData.bp,
                                      pulse: vitals.pulse || fullData.pulse,
                                      temp: vitals.temp || fullData.temp
                                    };
                                  }
                                }

                                // 3. Update state ONCE with full data
                                setData(fullData);
                              } catch (err) {
                                console.error('Failed to load patient data:', err);
                              } finally {
                                setIsSyncing(false);
                              }
                            }}
                            style={{
                              textAlign: 'left',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              border: '1px solid',
                              background: data.mrn === p.mrn ? 'var(--primary-subtle)' : 'white',
                              borderColor: data.mrn === p.mrn ? 'var(--primary)' : 'var(--border)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: data.mrn === p.mrn ? 'var(--primary)' : '#1e293b' }}>
                              {p.name}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>MRN: {p.mrn}</span>
                              <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 800 }}>
                                {(() => {
                                  if (!p.rx_date) return '---';
                                  const d = new Date(p.rx_date);
                                  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                                })()}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{p.age} {p.sex}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </aside>

                <section className={`form-section no-print ${activeTab === 'form' ? 'tab-active' : 'tab-hidden'}`}>
                  <div className="section-header-bar" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {!isSidebarVisible && (
                        <button
                          onClick={() => setIsSidebarVisible(true)}
                          className="desktop-only"
                          style={{ background: 'var(--primary-subtle)', color: 'var(--primary)', border: 'none', borderRadius: '6px', padding: '6px 10px', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                          ☰ OP List
                        </button>
                      )}
                      <h2 className="section-title">Create Prescription</h2>
                    </div>
                    <div className="action-btns desktop-only">
                      <button onClick={() => handleAutoSave(true)} className="print-btn" style={{ background: '#2563eb' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        Save
                      </button>
                      <button onClick={handleShare} className="print-btn" style={{ background: '#43a047' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                        Share
                      </button>
                      <button onClick={handlePrint} className="print-btn" style={{ background: 'var(--text)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
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
                    onSave={() => handleAutoSave(true)}
                  />
                </section>

                <section className={`preview-section ${activeTab === 'preview' ? 'tab-active' : 'tab-hidden'}`}>
                  <div className="section-header-bar no-print" style={{ marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.1rem' }}>Live Preview</h2>
                    <div className="action-btns">
                      <button onClick={() => handleAutoSave(true)} className="print-btn no-print" style={{ background: '#2563eb' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        Save
                      </button>
                      <button onClick={handleShare} className="print-btn no-print" style={{ background: '#43a047' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.41" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                        Share
                      </button>
                      <button onClick={handlePrint} className="print-btn no-print">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
                        Print
                      </button>
                    </div>
                  </div>
                  <div className="preview-scroll-wrapper">
                    <PrescriptionPreview data={data} />
                  </div>
                </section>
              </main>

              <footer className="no-print" style={{ padding: '1.5rem 2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
                <p>© 2026 Guardian Pharmacy & Clinic. All rights reserved.</p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>
                  <a href="https://myportfoliomuhsin.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    Developed by <span style={{ color: 'var(--primary)' }}>Muhsin</span>
                  </a>
                </p>
              </footer>
            </div>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </Router>
  )
}

export default App
