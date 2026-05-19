import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { databaseService } from '../services/databaseService'
import PrescriptionPreview from './PrescriptionPreview'

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('medicines')
  const [medicines, setMedicines] = useState([])
  const [users, setUsers] = useState([])
  const [patients, setPatients] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [modalPatient, setModalPatient] = useState(null)  // patient object or null
  const [selectedRxIndex, setSelectedRxIndex] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [clinicSettings, setClinicSettings] = useState({
    name: 'THULIR MULTISPECIALITY HOSPITAL',
    phone: '04366 222108, 70949 19494, 70949 29494'
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [newPatient, setNewPatient] = useState({
    mrn: '',
    patientName: '',
    age: '',
    gender: 'Male',
    phone: '',
    weight: '',
    bp: '',
    pulse: '',
    temp: ''
  })

  useEffect(() => {
    const fetchAllData = async () => {
      setIsSyncing(true);
      try {
        // Load Medicines
        const dbMeds = await databaseService.getMedicines();
        if (dbMeds) {
          setMedicines(dbMeds);
        }

        // Load Clinic Settings
        const dbSettings = await databaseService.getSettings();
        if (dbSettings) {
          setClinicSettings(dbSettings);
        }

        // Load Registered Doctors
        const dbUsers = await databaseService.getUsers();
        if (dbUsers) {
          setUsers(dbUsers);
        }

        // Load Patients & Prescriptions
        const dbPatients = await databaseService.getAllPatients();
        if (dbPatients) setPatients(dbPatients);

        const dbPrescriptions = await databaseService.getPrescriptions();
        if (dbPrescriptions) setPrescriptions(dbPrescriptions);
      } catch (err) {
        console.error('Failed to fetch admin data:', err);
      } finally {
        setIsSyncing(false);
      }
    };
    fetchAllData();
  }, [])

  const saveMedicines = (newList) => {
    setMedicines(newList);
  }

  const handleAddMedicine = () => {
    const newMed = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'Tablet',
      composition: '',
      category: ''
    }
    setMedicines([newMed, ...medicines]);
  }

  const handleUpdateMed = (id, field, value) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  const handleSaveMed = async (med) => {
    if (!med.name.trim()) return;
    try {
      await databaseService.syncMedicines([med]);
    } catch (err) {
      console.error('Failed to auto-save medicine to Neon DB:', err);
    }
  }

  const handleDeleteMed = async (id) => {
    if (window.confirm('Delete this row?')) {
      try {
        await databaseService.deleteMedicine(id);
        setMedicines(prev => prev.filter(m => m.id !== id));
      } catch (err) {
        console.error('Failed to delete medicine:', err);
        alert('Failed to delete from database.');
      }
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      const result = await databaseService.saveSettings(clinicSettings);
      if (result) alert('Settings saved to Neon Database!');
      else alert('Failed to save settings.');
    } catch (err) {
      console.error(err);
      alert('Error saving settings.');
    } finally {
      setIsSyncing(false);
    }
  }

  const handleUpdateUser = async (id, field, value) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    const updatedUser = { ...user, [field]: value };
    setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));
    
    // Auto-save user update to DB
    try {
      await databaseService.updateUser(updatedUser);
    } catch (err) {
      console.error('Failed to update user in DB:', err);
    }
  }

  const handleDeleteUser = async (id) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    if (window.confirm(`Are you sure you want to delete doctor account: ${user.name}?`)) {
      try {
        await databaseService.deleteUser(user.phone);
        setUsers(prev => prev.filter(u => u.id !== id));
        alert('User deleted successfully.');
      } catch (err) {
        console.error(err);
        alert('Failed to delete user.');
      }
    }
  }

  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    if (!newPatient.mrn || !newPatient.patientName) {
      alert('Patient ID (MRN) and Patient Name are required.');
      return;
    }
    setIsSyncing(true);
    try {
      await databaseService.savePatient(newPatient);
      alert('Patient registered successfully!');
      setIsRegisterModalOpen(false);
      // Re-fetch patient records to update UI
      const fetchedPatients = await databaseService.getAllPatients();
      setPatients(fetchedPatients || []);
    } catch (err) {
      console.error(err);
      alert('Failed to register patient: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  const filteredMedicines = medicines.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.composition?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const exportData = () => {
    const dataStr = JSON.stringify(medicines, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'medicines_database.json'
    link.click()
  }

  const handleSyncToDB = async () => {
    if (!window.confirm('Sync medicines to Neon Database? This will overwrite existing records in the cloud.')) return;
    
    setIsSyncing(true);
    try {
      const result = await databaseService.syncMedicines(medicines);
      if (result) {
        alert('Medicines successfully synced to Neon Database!');
      } else {
        alert('Sync failed. Please check your connection and Neon API configuration.');
      }
    } catch (err) {
      console.error(err);
      alert('Error during sync: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="excel-admin">
      {/* Sidebar Backdrop for Mobile */}
      {isSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* ── Sidebar ── */}
      <aside className={`excel-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="excel-logo">
          <div className="logo-box">G</div>
          <span>Guardian Admin</span>
          <button className="sidebar-close-x" onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>
        
        <nav>
          <button className={activeTab === 'medicines' ? 'active' : ''} onClick={() => { setActiveTab('medicines'); setSearchTerm(''); setIsSidebarOpen(false); }}>
            <span className="icon">📂</span> Medicine Master
          </button>
          <button className={activeTab === 'patients' ? 'active' : ''} onClick={() => { setActiveTab('patients'); setSearchTerm(''); setIsSidebarOpen(false); }}>
            <span className="icon">🏥</span> Patient Records
          </button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => { setActiveTab('users'); setSearchTerm(''); setIsSidebarOpen(false); }}>
            <span className="icon">👤</span> Doctor Accounts
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}>
            <span className="icon">⚙️</span> Clinic Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button onClick={exportData} className="export-btn">💾 Backup Data (JSON)</button>
          <button onClick={() => navigate('/')} className="home-btn">← Website Home</button>
          <button onClick={() => { onLogout(); navigate('/login'); }} className="logout-btn">Logout</button>
        </div>
      </aside>

      {/* ── Main Grid ── */}
      <main className="excel-main">
        <header className="excel-header">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="hamburger-menu" onClick={() => setIsSidebarOpen(true)}>☰</button>
            <div>
              <h1>
                {activeTab === 'medicines' ? 'Medicine Database Grid' : 
                 activeTab === 'patients' ? 'Patient Records' :
                 activeTab === 'users' ? 'Doctor Management Console' : 
                 'System Configuration'}
              </h1>
              <p>
                {activeTab === 'medicines' ? `${medicines.length} Rows found` :
                 activeTab === 'patients' ? `${patients.length} Patients registered` :
                 activeTab === 'users' ? `${users.length} Registered Doctors` : 
                 'Global Settings'}
              </p>
            </div>
          </div>
          
          {(activeTab === 'medicines' || activeTab === 'users' || activeTab === 'patients') && (
            <div className="header-right">
              <div className="excel-search">
                <input 
                  placeholder={`Search ${activeTab === 'medicines' ? 'medicines' : activeTab === 'patients' ? 'patients by name or MRN...' : 'doctors'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {activeTab === 'patients' && (
                <button 
                  onClick={() => {
                    setNewPatient({
                      mrn: '',
                      patientName: '',
                      age: '',
                      gender: 'Male',
                      phone: '',
                      weight: '',
                      bp: '',
                      pulse: '',
                      temp: ''
                    });
                    setIsRegisterModalOpen(true);
                  }}
                  className="excel-add-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981' }}
                >
                  ➕ Register Patient
                </button>
              )}
              {activeTab === 'medicines' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={async () => {
                      setIsSyncing(true);
                      try {
                        const result = await databaseService.syncMedicines(medicines);
                        if (result) alert('Medicines saved successfully!');
                        else alert('Failed to save medicines.');
                      } catch (err) {
                        console.error(err);
                        alert('Error saving: ' + err.message);
                      } finally {
                        setIsSyncing(false);
                      }
                    }} 
                    className="excel-add-btn" 
                    style={{ background: '#16a34a' }}
                    disabled={isSyncing}
                  >
                    {isSyncing ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button onClick={handleAddMedicine} className="excel-add-btn">+ Add New Row</button>
                </div>
              )}
            </div>
          )}
        </header>

        <div className="excel-content">
          {activeTab === 'medicines' && (
            <div className="grid-container">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="row-num-col">#</th>
                    <th>Medicine Name</th>
                    <th style={{ width: '120px' }}>Type</th>
                    <th>Composition / Dosage</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Del</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMedicines.map((med, idx) => (
                    <tr key={med.id}>
                      <td className="row-num-col">{idx + 1}</td>
                      <td>
                        <input 
                          value={med.name} 
                          onChange={(e) => handleUpdateMed(med.id, 'name', e.target.value)}
                          onBlur={() => handleSaveMed(med)}
                          placeholder="Enter Name..."
                        />
                      </td>
                      <td>
                        <select 
                          value={med.type} 
                          onChange={(e) => {
                            const newType = e.target.value;
                            handleUpdateMed(med.id, 'type', newType);
                            handleSaveMed({ ...med, type: newType });
                          }}
                        >
                          <option>Tablet</option>
                          <option>Capsule</option>
                          <option>Syrup</option>
                          <option>Injection</option>
                          <option>Drops</option>
                          <option>Ointment</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          value={med.composition} 
                          onChange={(e) => handleUpdateMed(med.id, 'composition', e.target.value)}
                          onBlur={() => handleSaveMed(med)}
                          placeholder="e.g. 500mg"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleDeleteMed(med.id)} className="excel-del-row">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid-container">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th className="row-num-col">#</th>
                    <th>Full Name</th>
                    <th>Qualification</th>
                    <th>Consultant Role</th>
                    <th>Reg. No</th>
                    <th>Mobile</th>
                    <th>Password</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Del</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, idx) => (
                    <tr key={user.id}>
                      <td className="row-num-col">{idx + 1}</td>
                      <td>
                        <input 
                          value={user.name} 
                          onChange={(e) => handleUpdateUser(user.id, 'name', e.target.value)}
                          placeholder="Doctor Name..."
                        />
                      </td>
                      <td>
                        <input 
                          value={user.qualification || ''} 
                          onChange={(e) => handleUpdateUser(user.id, 'qualification', e.target.value)}
                          placeholder="MBBS, MD..."
                        />
                      </td>
                      <td>
                        <input 
                          value={user.consultant || ''} 
                          onChange={(e) => handleUpdateUser(user.id, 'consultant', e.target.value)}
                          placeholder="Consultant..."
                        />
                      </td>
                      <td>
                        <input 
                          value={user.regNo || ''} 
                          onChange={(e) => handleUpdateUser(user.id, 'regNo', e.target.value)}
                          placeholder="Reg No..."
                        />
                      </td>
                      <td>
                        <input 
                          value={user.phone} 
                          onChange={(e) => handleUpdateUser(user.id, 'phone', e.target.value)}
                          placeholder="Mobile Number..."
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          value={user.password} 
                          onChange={(e) => handleUpdateUser(user.id, 'password', e.target.value)}
                          placeholder="Password..."
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button onClick={() => handleDeleteUser(user.id)} className="excel-del-row">×</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        No doctors registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'patients' && (() => {
            const filteredPatients = patients.filter(p =>
              p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.mrn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.phone?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            return (
              <div className="grid-container">
                <table className="excel-table" style={{ tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th className="row-num-col">#</th>
                      <th>MRN</th>
                      <th>Patient Name</th>
                      <th style={{ width: 60 }}>Age</th>
                      <th style={{ width: 60 }}>Sex</th>
                      <th>Phone</th>
                      <th>Weight</th>
                      <th>BP</th>
                      <th>Pulse</th>
                      <th>Temp</th>
                      <th style={{ width: 90, textAlign: 'center' }}>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p, idx) => {
                      const patientRx = prescriptions.filter(rx => rx.mrn === p.mrn);
                      return (
                        <React.Fragment key={p.mrn}>
                          <tr>
                            <td className="row-num-col">{idx + 1}</td>
                            <td><span style={{ padding: '0 12px', display: 'block', fontWeight: 700, color: '#2563eb' }}>{p.mrn}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.name}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.age}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.sex}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.phone}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.last_weight}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.last_bp}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.last_pulse}</span></td>
                            <td><span style={{ padding: '0 12px', display: 'block' }}>{p.last_temp}</span></td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => { setModalPatient(p); setSelectedRxIndex(0); }}
                                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                📋 {patientRx.length}
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    {filteredPatients.length === 0 && (
                      <tr>
                        <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No patient records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {activeTab === 'settings' && (
            <div className="settings-excel">
              <div className="settings-grid-card">
                <h3>Clinic Data Setup</h3>
                <form onSubmit={handleSaveSettings}>
                  <div className="grid-field">
                    <label>Hospital/Clinic Name</label>
                    <input value={clinicSettings.name} onChange={(e) => setClinicSettings({...clinicSettings, name: e.target.value})} />
                  </div>
                  <div className="grid-field">
                    <label>Contact Info & Phone Numbers</label>
                    <textarea rows="4" value={clinicSettings.phone} onChange={(e) => setClinicSettings({...clinicSettings, phone: e.target.value})} />
                  </div>
                  <button type="submit" className="save-btn">Apply Changes</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Prescription History Modal ── */}
      {modalPatient && (() => {
        const patientRxs = prescriptions.filter(rx => rx.mrn === modalPatient.mrn);
        const activeRx = patientRxs[selectedRxIndex];
        let previewData = null;
        if (activeRx) {
          const docInfo = users.find(u => u.name === activeRx.doctor_name) || {};
          let vitals = {};
          try { vitals = JSON.parse(activeRx.vitals || '{}'); } catch (e) {}
          let meds = [];
          try { meds = JSON.parse(activeRx.medicines || '[]'); } catch (e) {}

          previewData = {
            mrn: activeRx.mrn || modalPatient.mrn || '',
            date: activeRx.date || '',
            patientName: activeRx.patient_name || modalPatient.name || '',
            age: modalPatient.age || '',
            gender: modalPatient.sex || '',
            phone: modalPatient.phone || '',
            weight: vitals.weight || '',
            bp: vitals.bp || '',
            pulse: vitals.pulse || '',
            temp: vitals.temp || '',
            complaints: activeRx.complaints || '',
            diagnosis: activeRx.diagnosis || '',
            medicines: meds,
            advice: activeRx.advice || '',
            followUp: activeRx.follow_up || '',
            doctorName: activeRx.doctor_name || '',
            doctorQualifications: docInfo.qualification || '',
            doctorRole: docInfo.consultant || '',
            doctorRegNo: activeRx.doctor_reg_no || ''
          };
        }

        return (
          <div className="admin-modal-overlay">
            <div className="admin-modal-content">
              {/* Modal Left: Prescriptions List */}
              <div className="admin-modal-sidebar">
                <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', position: 'relative' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Prescriptions</h3>
                    <span className="count-badge">{patientRxs.length} Records</span>
                  </div>
                  <button className="modal-header-close" onClick={() => setModalPatient(null)} style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '1.8rem',
                    cursor: 'pointer',
                    fontWeight: '700',
                    lineHeight: '1',
                    padding: '0 5px'
                  }}>×</button>
                </div>
                <div className="sidebar-list">
                  {patientRxs.map((rx, idx) => (
                    <div 
                      key={idx} 
                      className={`sidebar-item ${selectedRxIndex === idx ? 'active' : ''}`}
                      onClick={() => setSelectedRxIndex(idx)}
                    >
                      <div className="rx-date">📅 {rx.date}</div>
                      <div className="rx-doc">Dr. {rx.doctor_name}</div>
                      {rx.diagnosis && <div className="rx-diag">{rx.diagnosis}</div>}
                    </div>
                  ))}
                  {patientRxs.length === 0 && (
                    <div className="no-records">No prescriptions found.</div>
                  )}
                </div>
                <button className="modal-close-btn" onClick={() => setModalPatient(null)}>Close Viewer</button>
              </div>

              {/* Modal Right: Selected Prescription Live Preview */}
              <div className="admin-modal-preview">
                {previewData ? (
                  <>
                    <div className="preview-toolbar">
                      <div className="toolbar-info">
                        <strong>Viewing Prescription</strong>
                        <span>Patient ID: {previewData.mrn}</span>
                      </div>
                      <div className="toolbar-actions">
                        <button className="print-btn" onClick={() => {
                          const paperEl = document.getElementById('prescription-paper');
                          if (!paperEl) { alert('Prescription preview element not found.'); return; }
                          const printWindow = window.open('', '_blank', 'width=900,height=800');
                          printWindow.document.write(
                            '<!DOCTYPE html>' +
                            '<html>' +
                              '<head>' +
                                '<meta charset="utf-8" />' +
                                '<title>Prescription Preview</title>' +
                                '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;900&family=Inter:wght@400;600;700&display=swap" />' +
                                '<style>' +
                                  '* { box-sizing: border-box; margin: 0; padding: 0; }' +
                                  'body { background: #e8edf2; font-family: \'Noto Sans Tamil\', sans-serif; }' +
                                  '#print-toolbar { position: sticky; top: 0; z-index: 100; background: #1565C0; display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; color: white; }' +
                                  '#print-toolbar button { background: white; color: #1565C0; border: none; padding: 8px 22px; border-radius: 6px; font-weight: 700; cursor: pointer; }' +
                                  '#paper-wrapper { display: flex; justify-content: center; padding: 30px; }' +
                                  '#prescription-paper { width: 210mm; min-height: 297mm; background: white; padding: 0.8cm 1.2cm; box-shadow: 0 4px 30px rgba(0,0,0,0.1); }' +
                                  '@media print { #print-toolbar { display: none !important; } body { background: white !important; } #paper-wrapper { padding: 0 !important; } }' +
                                '</style>' +
                              '</head>' +
                              '<body>' +
                                '<div id="print-toolbar"><span>📄 Prescription Preview</span><button onclick="window.print()">🖨 Print</button></div>' +
                                '<div id="paper-wrapper">' + paperEl.outerHTML + '</div>' +
                              '</body>' +
                            '</html>'
                          );
                          printWindow.document.close();
                        }}>🖨️ Print Prescription</button>
                      </div>
                    </div>
                    <div className="preview-paper-scroller">
                      <div className="paper-scale-container">
                        <PrescriptionPreview data={previewData} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="no-preview-selected">Select a prescription from the sidebar to view it.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Patient Registration Modal ── */}
      {isRegisterModalOpen && (
        <div className="admin-modal-overlay">
          <div className="registration-modal-content">
            <div className="registration-modal-header">
              <h2>Register New Patient</h2>
              <button className="registration-close-btn" onClick={() => setIsRegisterModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleRegisterPatient} className="registration-form">
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Patient ID / MRN *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter Unique Patient ID or MRN..." 
                    value={newPatient.mrn} 
                    onChange={(e) => setNewPatient({ ...newPatient, mrn: e.target.value })}
                  />
                </div>
                <div className="form-field full-width">
                  <label>Patient Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter Patient's Full Name..." 
                    value={newPatient.patientName} 
                    onChange={(e) => setNewPatient({ ...newPatient, patientName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Age</label>
                  <input 
                    type="number" 
                    placeholder="Age..." 
                    value={newPatient.age} 
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Gender / Sex</label>
                  <select 
                    value={newPatient.gender} 
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-field full-width">
                  <label>Contact Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="Mobile or Landline Number..." 
                    value={newPatient.phone} 
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  />
                </div>
                
                <div className="form-divider full-width">Vitals & Physical Metrics</div>

                <div className="form-field">
                  <label>Weight (kg)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 70" 
                    value={newPatient.weight} 
                    onChange={(e) => setNewPatient({ ...newPatient, weight: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Blood Pressure (BP)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 120/80" 
                    value={newPatient.bp} 
                    onChange={(e) => setNewPatient({ ...newPatient, bp: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Pulse Rate (bpm)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 72" 
                    value={newPatient.pulse} 
                    onChange={(e) => setNewPatient({ ...newPatient, pulse: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Temperature (°F)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 98.6" 
                    value={newPatient.temp} 
                    onChange={(e) => setNewPatient({ ...newPatient, temp: e.target.value })}
                  />
                </div>
              </div>

              <div className="registration-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsRegisterModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={isSyncing}>
                  {isSyncing ? 'Registering...' : '💾 Save Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .excel-admin {
          display: flex;
          height: 100vh;
          background: #f3f4f6;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1f2937;
        }

        /* Excel Sidebar */
        .excel-sidebar {
          width: 240px;
          background: #1e293b;
          color: white;
          display: flex;
          flex-direction: column;
          padding: 20px 0;
        }
        .excel-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px 25px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .logo-box {
          width: 32px;
          height: 32px;
          background: #22c55e;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }
        .excel-logo span { font-weight: 600; font-size: 0.9rem; }
        
        .hamburger-menu {
          display: none;
        }
        .sidebar-close-x {
          display: none;
        }
        .sidebar-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.4);
          z-index: 1400;
          backdrop-filter: blur(2px);
        }

        .excel-sidebar nav { flex: 1; padding: 20px 10px; }
        .excel-sidebar nav button {
          width: 100%;
          padding: 10px 15px;
          background: none;
          border: none;
          color: #94a3b8;
          text-align: left;
          cursor: pointer;
          border-radius: 6px;
          font-size: 0.85rem;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .excel-sidebar nav button:hover { background: rgba(255,255,255,0.05); color: white; }
        .excel-sidebar nav button.active { background: #2563eb; color: white; }

        .sidebar-bottom { padding: 20px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1); }
        .sidebar-bottom button { padding: 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; border: none; font-weight: 600; }
        .export-btn { background: #059669; color: white; }
        .home-btn { background: #475569; color: white; }
        .logout-btn { background: #dc2626; color: white; }

        /* Excel Main Area */
        .excel-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .excel-header {
          background: white;
          padding: 15px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #d1d5db;
        }
        .header-left h1 { font-size: 1.25rem; margin: 0; color: #111827; }
        .header-left p { font-size: 0.75rem; margin: 2px 0 0; color: #6b7280; }

        .header-right { display: flex; gap: 12px; }
        .excel-search input {
          border: 1px solid #d1d5db;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.85rem;
          width: 250px;
          outline: none;
        }
        .excel-search input:focus { border-color: #2563eb; ring: 2px solid #bfdbfe; }
        .excel-add-btn { background: #2563eb; color: white; border: none; padding: 6px 15px; border-radius: 4px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }

        /* The Grid Table */
        .excel-content { flex: 1; overflow: auto; padding: 0; background: white; }
        .grid-container { min-width: 100%; }
        .excel-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 0.85rem;
        }
        .excel-table th {
          position: sticky;
          top: 0;
          background: #f9fafb;
          color: #4b5563;
          font-weight: 600;
          text-align: left;
          padding: 8px 12px;
          border-bottom: 2px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          z-index: 10;
        }
        .excel-table td {
          border-bottom: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          padding: 0;
        }
        .row-num-col {
          width: 40px;
          background: #f3f4f6;
          text-align: center !important;
          color: #9ca3af;
          font-size: 0.7rem;
        }
        
        .excel-table input, .excel-table select {
          width: 100%;
          height: 35px;
          border: none;
          padding: 0 12px;
          background: transparent;
          outline: none;
          font-size: 0.85rem;
          color: #374151;
        }
        .excel-table input:focus, .excel-table select:focus {
          background: #f0f9ff;
          box-shadow: inset 0 0 0 2px #3b82f6;
        }
        .excel-del-row {
          background: none;
          border: none;
          color: #d1d5db;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          width: 100%;
          height: 35px;
        }
        .excel-del-row:hover { color: #ef4444; background: #fee2e2; }

        /* Settings Styles */
        .settings-excel { padding: 40px; display: flex; justify-content: center; }
        .settings-grid-card { background: white; border: 1px solid #d1d5db; border-radius: 8px; width: 100%; max-width: 600px; padding: 30px; }
        .settings-grid-card h3 { margin: 0 0 20px; border-bottom: 2px solid #2563eb; display: inline-block; padding-bottom: 5px; }
        .grid-field { margin-bottom: 20px; }
        .grid-field label { display: block; font-size: 0.8rem; font-weight: 700; color: #4b5563; margin-bottom: 8px; text-transform: uppercase; }
        .grid-field input, .grid-field textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.95rem;
          outline: none;
        }
        .save-btn { background: #2563eb; color: white; border: none; padding: 12px 25px; border-radius: 4px; font-weight: 700; cursor: pointer; }

        /* Modal Styles */
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }
        .admin-modal-content {
          background: white;
          width: 100%;
          max-width: 1200px;
          height: 90vh;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          overflow: hidden;
        }
        .admin-modal-sidebar {
          width: 300px;
          border-right: 1px solid #e2e8f0;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
        }
        .sidebar-header {
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        .sidebar-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #0f172a;
        }
        .count-badge {
          font-size: 0.75rem;
          background: #dbeafe;
          color: #2563eb;
          padding: 2px 8px;
          border-radius: 9999px;
          font-weight: 600;
          margin-top: 4px;
          display: inline-block;
        }
        .sidebar-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }
        .sidebar-item {
          padding: 12px 15px;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          transition: all 0.2s;
          color: #334155;
        }
        .sidebar-item:hover {
          border-color: #cbd5e1;
          background: #f1f5f9;
        }
        .sidebar-item.active {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }
        .rx-date {
          font-weight: 700;
          font-size: 0.85rem;
        }
        .rx-doc {
          font-size: 0.8rem;
          margin-top: 2px;
          opacity: 0.9;
        }
        .rx-diag {
          font-size: 0.75rem;
          margin-top: 4px;
          font-style: italic;
          opacity: 0.8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .modal-close-btn {
          margin: 20px;
          padding: 10px;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }
        .modal-close-btn:hover {
          background: #b91c1c;
        }
        .admin-modal-preview {
          flex: 1;
          background: #e2e8f0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .preview-toolbar {
          background: white;
          padding: 15px 25px;
          border-bottom: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .toolbar-info strong {
          display: block;
          font-size: 1rem;
          color: #0f172a;
        }
        .toolbar-info span {
          font-size: 0.8rem;
          color: #64748b;
        }
        .toolbar-actions .print-btn {
          background: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .toolbar-actions .print-btn:hover {
          background: #1d4ed8;
        }
        .preview-paper-scroller {
          flex: 1;
          overflow: auto;
          padding: 25px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .paper-scale-container {
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        .no-preview-selected, .no-records {
          padding: 40px;
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
        }

        /* Patient Registration Modal Specific Styles */
        .registration-modal-content {
          background: white;
          width: 100%;
          max-width: 650px;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalAppear 0.3s ease-out;
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .registration-modal-header {
          padding: 20px 25px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }
        .registration-modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #0f172a;
          font-weight: 700;
        }
        .registration-close-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 1.75rem;
          cursor: pointer;
          font-weight: 600;
          line-height: 1;
        }
        .registration-close-btn:hover {
          color: #ef4444;
        }
        .registration-form {
          padding: 25px;
          overflow-y: auto;
          max-height: 75vh;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px 20px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-field.full-width {
          grid-column: span 2;
        }
        .form-field label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
        }
        .form-field input, .form-field select {
          padding: 10px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-field input:focus, .form-field select:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .form-divider {
          grid-column: span 2;
          font-size: 0.85rem;
          font-weight: 700;
          color: #2563eb;
          border-bottom: 2px solid #dbeafe;
          padding-bottom: 5px;
          margin-top: 10px;
          text-transform: uppercase;
        }
        .registration-actions {
          margin-top: 25px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
        }
        .registration-actions button {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
        }
        .registration-actions .cancel-btn {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #475569;
        }
        .registration-actions .cancel-btn:hover {
          background: #e2e8f0;
        }
        .registration-actions .submit-btn {
          background: #2563eb;
          border: none;
          color: white;
        }
        .registration-actions .submit-btn:hover {
          background: #1d4ed8;
        }

        /* ── Responsive Styling ── */
        @media (max-width: 768px) {
          .registration-modal-content {
            height: auto;
            max-height: 95vh;
            width: 100%;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-field.full-width {
            grid-column: span 1;
          }
          .form-divider {
            grid-column: span 1;
          }
          .excel-admin {
            position: relative;
            overflow: hidden;
          }
          .excel-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 1500;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 4px 0 25px rgba(0, 0, 0, 0.15);
            width: 280px;
          }
          .excel-sidebar.mobile-open {
            transform: translateX(0);
          }
          .sidebar-close-x {
            display: block;
            background: none;
            border: none;
            color: #ef4444;
            font-size: 1.8rem;
            cursor: pointer;
            margin-left: auto;
            padding: 0 10px;
            font-weight: 700;
          }
          .excel-logo {
            justify-content: space-between;
          }
          .hamburger-menu {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            font-size: 1.25rem;
            width: 38px;
            height: 38px;
            border-radius: 8px;
            cursor: pointer;
            color: #334155;
            transition: background 0.2s;
          }
          .hamburger-menu:hover {
            background: #e2e8f0;
          }
          .excel-header {
            padding: 15px;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .header-right {
            width: 100%;
            flex-direction: column;
            gap: 10px;
          }
          .excel-search {
            width: 100%;
          }
          .excel-search input {
            width: 100%;
            height: 38px;
          }
          .header-right button {
            width: 100%;
            height: 38px;
            justify-content: center;
          }

          /* Scrollable grids on mobile */
          .excel-content {
            overflow: auto;
            -webkit-overflow-scrolling: touch;
          }
          .grid-container {
            width: 100%;
            overflow-x: auto;
          }

          /* Modal Stack on Mobile */
          .admin-modal-content {
            flex-direction: column;
            height: 95vh;
            width: 100%;
          }
          .admin-modal-sidebar {
            width: 100%;
            max-height: 200px;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
          }
          .sidebar-list {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 10px;
          }
          .sidebar-item {
            margin-bottom: 0;
            flex-shrink: 0;
            width: 190px;
            padding: 8px 12px;
          }
          .modal-close-btn {
            display: none; /* Let Close Viewer button live in the sidebar header or as top close button */
          }
          .sidebar-header {
            padding: 10px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .sidebar-header h3 {
            font-size: 0.95rem;
          }
          

          
          .admin-modal-preview {
            flex: 1;
            height: calc(100% - 200px);
          }
          .preview-toolbar {
            padding: 10px 15px;
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
          .preview-toolbar .toolbar-actions {
            width: 100%;
          }
          .preview-toolbar .print-btn {
            width: 100%;
            justify-content: center;
          }
          
          /* Scale A4 down for mobile screen width */
          .preview-paper-scroller {
            padding: 10px;
          }
          .paper-scale-container {
            transform: scale(0.48);
            transform-origin: top center;
            width: 210mm;
            height: auto;
          }
        }

        @media (max-width: 480px) {
          .paper-scale-container {
            transform: scale(0.38);
          }
        }
      ` }} />
    </div>
  )
}

export default AdminDashboard
