import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { databaseService } from '../services/databaseService'
import PrescriptionPreview from './PrescriptionPreview'

const sortPatientsByMRN = (list) => {
  return [...list].sort((a, b) => {
    const numA = parseInt(a.mrn, 10);
    const numB = parseInt(b.mrn, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a.mrn).localeCompare(String(b.mrn));
  });
};

const getNextAutomationMRN = (existingPatients) => {
  const numericMRNs = existingPatients
    .map(p => {
      const trimmed = p.mrn?.trim() || '';
      if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
      return NaN;
    })
    .filter(num => !isNaN(num) && num >= 0);

  if (numericMRNs.length > 0) {
    const maxMRN = Math.max(...numericMRNs);
    return (maxMRN + 1).toString();
  }
  return '1';
};

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('todayop')
  const [medicines, setMedicines] = useState([])
  const [users, setUsers] = useState([])
  const [patients, setPatients] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [allPrescriptions, setAllPrescriptions] = useState([])
  const [modalPatient, setModalPatient] = useState(null)  // patient object or null
  const [selectedRxIndex, setSelectedRxIndex] = useState(0)
  const [modalPatientHistory, setModalPatientHistory] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isDoctorEditModalOpen, setIsDoctorEditModalOpen] = useState(false)
  const [editingDoctorName, setEditingDoctorName] = useState('')
  const [isPickPatientModalOpen, setIsPickPatientModalOpen] = useState(false)
  const [pickPatientSearch, setPickPatientSearch] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)) // YYYY-MM
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
    gender: '',
    phone: '',
    weight: '',
    bp: '',
    pulse: '',
    temp: '',
    date: new Date().toLocaleDateString('en-CA')
  })
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState({
    mrn: '',
    patientName: '',
    age: '',
    gender: 'Male',
    phone: '',
    weight: '',
    bp: '',
    pulse: '',
    temp: '',
    registration_date: ''
  })
  const [opFees, setOpFees] = useState({}) // { [mrn]: { drFees: '', medFees: '', total: '' } }
  const [pendingDeleteMrn, setPendingDeleteMrn] = useState(null) // Today OP inline confirm
  const [pendingDeletePatientMrn, setPendingDeletePatientMrn] = useState(null) // Patient Records inline confirm
  const [isDoctorAccountEditModalOpen, setIsDoctorAccountEditModalOpen] = useState(false)
  const [editingDoctorAccount, setEditingDoctorAccount] = useState({
    id: '',
    name: '',
    phone: '',
    password: '',
    qualification: '',
    consultant: '',
    reg_no: ''
  })
  const [isActionBusy, setIsActionBusy] = useState(false)

  // --- Granular Fetchers for Better Performance ---
  const fetchMedicines = async () => {
    try {
      const dbMeds = await databaseService.getMedicines();
      if (dbMeds) setMedicines(dbMeds);
    } catch (e) { console.error(e); }
  };

  const fetchUsers = async () => {
    try {
      let dbUsers = await databaseService.getUsers();
      if (!dbUsers || dbUsers.length === 0) {
        const defaults = ["DR. UMA MAHESHWARAN", "DR. PRAGADEESH", "DR.G.GOPINATH", "DR.G.VIGNESH", "DR.SWAMINATHAN", "DR.VIGESH"];
        for (const name of defaults) {
          try { await databaseService.saveDoctor({ name }); } catch (e) { }
        }
        dbUsers = await databaseService.getUsers();
      }
      if (dbUsers) setUsers(dbUsers);
    } catch (e) { console.error(e); }
  };

  const fetchPatients = async () => {
    try {
      const dbPatients = await databaseService.getAllPatients();
      if (dbPatients) setPatients(sortPatientsByMRN(dbPatients));
    } catch (e) { console.error(e); }
  };

  const fetchTodayOpData = async () => {
    try {
      const dbPrescriptions = await databaseService.getPrescriptions(null, selectedDate);
      if (dbPrescriptions) {
        setPrescriptions(dbPrescriptions);
        const initialFees = {};
        dbPrescriptions.forEach(rx => {
          if (rx.date === selectedDate) {
            const drFees = rx.dr_fees || '';
            const medFees = rx.med_fees || '';
            const parseFee = v => v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0);
            const total = parseFee(drFees) + parseFee(medFees);
            const bothNil = drFees?.toLowerCase() === 'nil' && medFees?.toLowerCase() === 'nil';
            initialFees[rx.id] = { drFees, medFees, total: bothNil ? 'Nil' : (total > 0 ? total : '') };
          }
        });
        setOpFees(initialFees);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAllPrescriptions = async () => {
    try {
      const dbAllPrescriptions = await databaseService.getPrescriptions(null, null);
      if (dbAllPrescriptions) setAllPrescriptions(dbAllPrescriptions);
    } catch (e) { console.error(e); }
  };

  const fetchClinicSettings = async () => {
    try {
      const dbSettings = await databaseService.getSettings();
      if (dbSettings) setClinicSettings(dbSettings);
    } catch (e) { console.error(e); }
  }

  // Optimized Fetcher: Only fetches what is needed for the CURRENT tab
  const refreshActiveTabData = React.useCallback(async (isFullRefresh = false) => {
    setIsSyncing(true);
    const tasks = [];

    // Always fetch settings once if not loaded
    if (!clinicSettings.name || isFullRefresh) tasks.push(fetchClinicSettings());

    if (isFullRefresh) {
      // Full refresh always loads ALL data regardless of active tab
      tasks.push(fetchMedicines(), fetchUsers(), fetchPatients(), fetchTodayOpData(), fetchAllPrescriptions());
    } else if (activeTab === 'todayop') {
      tasks.push(fetchTodayOpData());
      tasks.push(fetchUsers());
      tasks.push(fetchPatients()); // Needed for patient names in Today OP
    } else if (activeTab === 'medicines') {
      tasks.push(fetchMedicines());
    } else if (activeTab === 'patients') {
      tasks.push(fetchPatients());
      tasks.push(fetchAllPrescriptions()); // Needed for visit counts
    } else if (activeTab === 'users') {
      tasks.push(fetchUsers());
    } else if (activeTab === 'monthly') {
      tasks.push(fetchAllPrescriptions());
    }

    await Promise.all(tasks);
    setIsSyncing(false);
  }, [activeTab, selectedDate, clinicSettings.name]);

  const fetchAllData = () => refreshActiveTabData(true);

  // Initial load
  useEffect(() => { refreshActiveTabData(true); }, [refreshActiveTabData]);

  // Optimized visibility and sync handlers (only refresh what's active)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshActiveTabData();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshActiveTabData]);

  useEffect(() => {
    const channel = new BroadcastChannel('nexusrx_sync');
    channel.onmessage = (e) => {
      if (e.data === 'refresh') refreshActiveTabData();
    };
    return () => channel.close();
  }, [refreshActiveTabData]);

  useEffect(() => {
    if (activeTab !== 'todayop') return;
    const interval = setInterval(() => refreshActiveTabData(), 30000);
    return () => clearInterval(interval);
  }, [activeTab, refreshActiveTabData]);

  // Load full history when modal opens
  useEffect(() => {
    if (!modalPatient) {
      setModalPatientHistory([]);
      return;
    }
    const fetchHistory = async () => {
      try {
        const history = await databaseService.getPrescriptionsByMRN(modalPatient.mrn);
        if (history) setModalPatientHistory(history);
      } catch (err) {
        console.error('Failed to fetch patient history:', err);
      }
    };
    fetchHistory();
  }, [modalPatient]);

  const handleAssignDoctor = async (mrn, patientName, doctorName, rxId = null) => {
    setIsSyncing(true);
    try {
      const doc = users.find(u => u.name === doctorName) || {};
      await databaseService.savePrescription({
        id: rxId, // If rxId is provided, the API will UPDATE. If null, it will INSERT.
        mrn,
        patientName,
        date: selectedDate,
        doctorName: doctorName || '', // Allow empty string for reset
        doctorRegNo: doc.regNo || doc.reg_no || ''
      });
      await fetchAllData();
      if (!rxId) alert(`${patientName} added to today's list!`);
    } catch (err) {
      console.error('Failed to assign doctor:', err);
      alert('Failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const applyGenderPrefix = (name, gender) => {
    let trimmedName = (name || '').trim();
    const titles = ['Mr.', 'Mrs.', 'Ms.', 'Master.', 'Miss.', 'Dr.'];

    let baseName = trimmedName;
    for (const t of titles) {
      if (trimmedName.toLowerCase().startsWith(t.toLowerCase() + ' ')) {
        baseName = trimmedName.substring(t.length + 1).trim();
        break;
      } else if (trimmedName.toLowerCase() === t.toLowerCase()) {
        baseName = '';
        break;
      }
    }

    let newPrefix = '';
    if (gender === 'Male') newPrefix = 'Mr. ';
    else if (gender === 'Female') newPrefix = 'Mrs. ';

    return newPrefix + baseName;
  };

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

  const handleEditDoctorAccount = async (e) => {
    e.preventDefault();
    console.log('Starting doctor account update for:', editingDoctorAccount);
    setIsActionBusy(true);
    try {
      await databaseService.updateUser(editingDoctorAccount);
      setIsDoctorAccountEditModalOpen(false);
      await fetchAllData();
      alert('Doctor account updated successfully!');
    } catch (err) {
      console.error('Failed to update doctor account:', err);
      alert('Failed to update: ' + (err.message || 'Unknown error'));
    } finally {
      setIsActionBusy(false);
    }
  };

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
    const isDuplicate = patients.some(p => p.mrn.toString() === newPatient.mrn.toString());
    if (isDuplicate) {
      alert(`Patient ID (MRN) "${newPatient.mrn}" is already registered. Please use a unique ID or edit the existing record.`);
      return;
    }
    setIsSyncing(true);
    // Capture current time at the moment of registration
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const registrationDateTime = `${newPatient.date} ${timeStr}`;
    try {
      await databaseService.savePatient({
        ...newPatient,
        last_weight: newPatient.weight,
        last_bp: newPatient.bp,
        last_pulse: newPatient.pulse,
        last_temp: newPatient.temp,
        registration_date: registrationDateTime
      });
      // Automatically create a prescription stub for today so they appear in 'Today OP'
      await databaseService.savePrescription({
        mrn: newPatient.mrn,
        patientName: newPatient.patientName,
        date: selectedDate
      });
      alert('Patient registered successfully!');
      setIsRegisterModalOpen(false);
      // Live automation pulse for other tabs/sidebar
      new BroadcastChannel('nexusrx_sync').postMessage('refresh');
      await fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to register patient: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  const handleEditPatient = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    try {
      // Find original patient to check if date changed
      const original = patients.find(p => p.mrn === editingPatient.mrn);
      let finalRegDate = editingPatient.registration_date;

      if (original && original.registration_date) {
        const originalDatePart = original.registration_date.split(' ')[0];
        const newDatePart = editingPatient.registration_date.split(' ')[0];

        // If the date (YYYY-MM-DD) hasn't changed, preserve the full original string (including time)
        if (originalDatePart === newDatePart) {
          finalRegDate = original.registration_date;
        }
      }

      await databaseService.savePatient({
        ...editingPatient,
        last_weight: editingPatient.weight,
        last_bp: editingPatient.bp,
        last_pulse: editingPatient.pulse,
        last_temp: editingPatient.temp,
        registration_date: finalRegDate
      });
      alert('Patient record updated successfully!');
      setIsEditModalOpen(false);
      // Live automation pulse
      new BroadcastChannel('nexusrx_sync').postMessage('refresh');
      // Re-fetch patient records to update UI
      const fetchedPatients = await databaseService.getAllPatients();
      setPatients(sortPatientsByMRN(fetchedPatients || []));
    } catch (err) {
      console.error(err);
      alert('Failed to update patient: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  const handleDeletePatient = async (mrn) => {
    setPendingDeletePatientMrn(null);
    setIsSyncing(true);
    try {
      await databaseService.deletePatient(String(mrn));
      // Live automation pulse
      new BroadcastChannel('nexusrx_sync').postMessage('refresh');
      await fetchAllData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete patient: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  const handleDeleteOPVisit = async (rxId) => {
    setIsSyncing(true);
    setPendingDeleteMrn(null);
    try {
      await databaseService.deletePrescription(rxId);
    } catch (err) {
      console.error('Delete prescription failed:', err);
      alert('Failed to remove: ' + err.message);
      setIsSyncing(false);
      return;
    }
    // Live automation pulse
    new BroadcastChannel('nexusrx_sync').postMessage('refresh');
    await fetchAllData();
    setIsSyncing(false);
  };

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
          <img src="/logo.png" alt="Guardian Logo" style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '6px', flexShrink: 0 }} />
          <span>Guardian Admin</span>
          <button className="sidebar-close-x" onClick={() => setIsSidebarOpen(false)}>×</button>
        </div>

        <nav>
          <button className={activeTab === 'todayop' ? 'active' : ''} onClick={() => { setActiveTab('todayop'); setSearchTerm(''); setIsSidebarOpen(false); }} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="icon">🩺</span> Today OP
            {(() => { const today = new Date().toLocaleDateString('en-IN'); const cnt = patients.filter(p => p.updated_at && new Date(p.updated_at).toLocaleDateString('en-IN') === today).length; return cnt > 0 ? <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>{cnt}</span> : null; })()}
          </button>
          <button className={activeTab === 'patients' ? 'active' : ''} onClick={() => { setActiveTab('patients'); setSearchTerm(''); setIsSidebarOpen(false); }}>
            <span className="icon">🏥</span> Patient Records
          </button>
          <button className={activeTab === 'medicines' ? 'active' : ''} onClick={() => { setActiveTab('medicines'); setSearchTerm(''); setIsSidebarOpen(false); }}>
            <span className="icon">📂</span> Medicine Master
          </button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => { setActiveTab('users'); setSearchTerm(''); setIsSidebarOpen(false); }}>
            <span className="icon">👤</span> Doctor Accounts
          </button>
          <button className={activeTab === 'monthly' ? 'active' : ''} onClick={() => { setActiveTab('monthly'); setSearchTerm(''); setIsSidebarOpen(false); }}>
            <span className="icon">📊</span> Monthly Collection
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
                    activeTab === 'todayop' ? "Today's OP List" :
                      activeTab === 'users' ? 'Doctor Management Console' :
                        activeTab === 'monthly' ? 'Monthly Collection Report' :
                          'System Configuration'}
              </h1>
              <p>
                {activeTab === 'medicines' ? `${medicines.length} Rows found` :
                  activeTab === 'patients' ? `${patients.length} Patients registered` :
                    activeTab === 'todayop' ? (() => {
                      const rxMrns = new Set(prescriptions.map(rx => rx.mrn));
                      const cnt = patients.filter(p => {
                        const updOnDate = p.updated_at && new Date(p.updated_at).toISOString().split('T')[0] === selectedDate;
                        return updOnDate || rxMrns.has(p.mrn);
                      }).length;
                      return `${cnt} Patients · ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`;
                    })() :
                      activeTab === 'users' ? `${users.length} Registered Doctors` :
                        'Global Settings'}
              </p>
            </div>
          </div>

          {(activeTab === 'medicines' || activeTab === 'users' || activeTab === 'patients' || activeTab === 'todayop') && (
            <div className="header-right">
              <div className="excel-search">
                <input
                  placeholder={`Search ${activeTab === 'medicines' ? 'medicines' : activeTab === 'patients' || activeTab === 'todayop' ? 'patients by name or MRN...' : 'doctors'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {activeTab === 'patients' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      const nextMRN = getNextAutomationMRN(patients);
                      setNewPatient({
                        mrn: nextMRN,
                        patientName: '',
                        age: '',
                        gender: '',
                        phone: '',
                        weight: '',
                        bp: '',
                        pulse: '',
                        temp: '',
                        date: new Date().toLocaleDateString('en-CA')
                      });
                      setIsRegisterModalOpen(true);
                    }}
                    className="excel-add-btn"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981' }}
                  >
                    ➕ Register Patient
                  </button>
                </div>
              )}
              {activeTab === 'todayop' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setPickPatientSearch('');
                      setIsPickPatientModalOpen(true);
                    }}
                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 4, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    ➕ Add Patient
                  </button>
                  <button
                    onClick={fetchAllData}
                    disabled={isSyncing}
                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: 4, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {isSyncing ? '⏳ Refreshing...' : '🔄 Refresh'}
                  </button>
                </div>
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
          {activeTab === 'todayop' && (() => {
            const todayOPList = prescriptions.filter(rx => {
              if (rx.date !== selectedDate) return false;

              // Find patient info
              const p = patients.find(pat => String(pat.mrn).trim() === String(rx.mrn).trim());

              // Filter by Search Term
              const searchLower = searchTerm.toLowerCase();
              const matchesSearch = !searchTerm ||
                (p?.name?.toLowerCase().includes(searchLower)) ||
                (String(rx.mrn).includes(searchTerm));
              if (!matchesSearch) return false;

              // Filter by Doctor
              if (selectedDoctor) {
                return rx.doctor_name?.toUpperCase().includes(selectedDoctor.toUpperCase());
              }
              return true;
            }).map(rx => {
              const p = patients.find(pat => String(pat.mrn).trim() === String(rx.mrn).trim());
              return { ...p, ...rx, rxId: rx.id }; // Merge patient info with prescription info
            });

            return (
              <div className="grid-container" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Date & Doctor Filter Row */}
                <div style={{ display: 'flex', gap: 15, alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: 8, border: '1px solid #e2e8f0', overflowX: 'auto', flexWrap: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap' }}>DATE:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.75rem', outline: 'none', background: 'white', fontWeight: 600, color: '#1e293b' }}
                    />
                  </div>
                  <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', whiteSpace: 'nowrap' }}>FILTER BY DOCTOR:</span>
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    style={{
                      padding: '4px 12px', borderRadius: 15, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                      background: selectedDoctor === null ? '#1e293b' : 'white',
                      color: selectedDoctor === null ? 'white' : '#475569',
                      border: '1px solid ' + (selectedDoctor === null ? '#1e293b' : '#cbd5e1'),
                      whiteSpace: 'nowrap'
                    }}
                  >ALL DOCTORS</button>
                  {(() => {
                    const base = ["DR. UMA MAHESHWARAN", "DR. PRAGADEESH", "DR.G.GOPINATH", "DR.G.VIGNESH", "DR.SWAMINATHAN"];
                    const excluded = ["PRAGADEESH", "UMAMAHESWARAN"];
                    const all = Array.from(new Set([...base, ...users.map(u => u.name.trim().toUpperCase())]))
                      .filter(name => name && !excluded.some(ex => name.includes(ex) && !name.startsWith("DR.")));
                    return all.map((docName, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDoctor(docName)}
                        style={{
                          padding: '4px 12px', borderRadius: 15, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                          background: selectedDoctor === docName ? '#2563eb' : 'white',
                          color: selectedDoctor === docName ? 'white' : '#475569',
                          border: '1px solid ' + (selectedDoctor === docName ? '#2563eb' : '#cbd5e1'),
                          whiteSpace: 'nowrap'
                        }}
                      >{docName.toUpperCase()}</button>
                    ));
                  })()}
                </div>
                {todayOPList.length === 0 ? (
                  <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🩺</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>No patients registered today</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '6px' }}>Showing records for: {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                ) : (
                  <table className="excel-table" style={{ tableLayout: 'auto' }}>
                    <thead>
                      <tr>
                        <th className="row-num-col">#</th>
                        <th>Token</th>
                        <th>MRN</th>
                        <th>Patient Name</th>
                        <th style={{ width: 50 }}>Age</th>
                        <th style={{ width: 60 }}>Sex</th>
                        <th>Phone</th>
                        <th style={{ minWidth: 200 }}>Attending Doctor</th>
                        <th style={{ width: 90, color: '#16a34a', textAlign: 'center' }}>Dr Fees (₹)</th>
                        <th style={{ width: 90, color: '#7c3aed', textAlign: 'center' }}>Medicine (₹)</th>
                        <th style={{ width: 90, color: '#dc2626', fontWeight: 800, textAlign: 'center' }}>Total (₹)</th>
                        <th style={{ width: 70, color: '#0369a1', fontWeight: 800, textAlign: 'center' }}>Visits</th>
                        <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayOPList.map((entry, idx) => {
                        // Count total patient prescription visits for the color/label
                        const allPatientRx = allPrescriptions.filter(rx => String(rx.mrn).trim() === String(entry.mrn).trim());
                        const visitDates = new Set(allPatientRx.map(rx => rx.date).filter(Boolean));
                        const visitCount = visitDates.size;
                        const visitColor = visitCount === 1 ? { bg: '#f0fdf4', border: '#86efac', text: '#15803d' } : visitCount === 2 ? { bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' } : visitCount === 3 ? { bg: '#fef3c7', border: '#fcd34d', text: '#b45309' } : { bg: '#fdf4ff', border: '#e879f9', text: '#7e22ce' };

                        return (
                          <tr key={entry.rxId} style={{ height: '28px' }}>
                            <td className="row-num-col">{idx + 1}</td>
                            <td><span style={{ padding: '2px 8px', display: 'inline-block', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 4, fontWeight: 700, fontSize: '0.78rem', color: '#92400e' }}>OP-{String(idx + 1).padStart(2, '0')}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block', fontWeight: 700, color: '#2563eb' }}>{entry.mrn}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{entry.name || entry.patient_name}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{entry.age}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{entry.sex}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{entry.phone}</span></td>
                            <td style={{ textAlign: 'center', minWidth: '150px' }}>
                              {entry.doctor_name ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                  <span style={{
                                    padding: '2px 8px',
                                    background: '#f0fdf4',
                                    color: '#166534',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: 4,
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                  }}>
                                    {entry.doctor_name}
                                  </span>
                                  <button
                                    onClick={() => handleAssignDoctor(entry.mrn, entry.name, '', entry.rxId)}
                                    title="Change Doctor"
                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', padding: '2px' }}
                                  >✏️</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center', padding: '4px 0' }}>
                                  {(Array.from(new Set(["DR. UMA MAHESHWARAN", "DR. PRAGADEESH", "DR.G.GOPINATH", "DR.G.VIGNESH", "DR.SWAMINATHAN", ...users.map(u => u.name.trim().toUpperCase())]))
                                    .filter(name => name && !["PRAGADEESH", "UMAMAHESWARAN"].some(ex => name.includes(ex) && !name.startsWith("DR."))))
                                    .map((name, bIdx) => (
                                      <button
                                        key={bIdx}
                                        onClick={(e) => { e.stopPropagation(); handleAssignDoctor(entry.mrn, entry.name, name, entry.rxId); }}
                                        className="doctor-chip-btn"
                                        style={{ padding: '4px 12px', fontSize: '0.68rem', fontWeight: 800, background: '#ffffff', border: '2px solid #e2e8f0', borderRadius: '20px', color: '#0f172a', cursor: 'pointer', whiteSpace: 'nowrap', textTransform: 'uppercase' }}
                                      >{name}</button>
                                    ))}
                                </div>
                              )}
                            </td>
                            <td className="fee-td" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <input
                                type="text"
                                className="no-spinners"
                                placeholder=""
                                value={opFees[entry.rxId]?.drFees || ''}
                                onChange={e => {
                                  const drFees = e.target.value;
                                  const medFees = opFees[entry.rxId]?.medFees || '';
                                  const parseFee = v => v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0);
                                  const total = parseFee(drFees) + parseFee(medFees);
                                  const bothNil = drFees?.toLowerCase() === 'nil' && medFees?.toLowerCase() === 'nil';
                                  setOpFees(prev => ({ ...prev, [entry.rxId]: { drFees, medFees, total: bothNil ? 'Nil' : (total > 0 ? total : '') } }));
                                }}
                                onBlur={async () => {
                                  const feeData = opFees[entry.rxId];
                                  await databaseService.saveFees(entry.mrn, selectedDate, entry.name, feeData.drFees, feeData.medFees, entry.rxId);
                                }}
                                style={{ width: '80px', padding: '2px 6px', border: '1px solid #bbf7d0', borderRadius: 4, fontSize: '0.8rem', background: '#f0fdf4', color: '#166534', fontWeight: 600, textAlign: 'center' }}
                              />
                            </td>
                            <td className="fee-td" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <input
                                type="text"
                                className="no-spinners"
                                placeholder=""
                                value={opFees[entry.rxId]?.medFees || ''}
                                onChange={e => {
                                  const medFees = e.target.value;
                                  const drFees = opFees[entry.rxId]?.drFees || '';
                                  const parseFee = v => v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0);
                                  const total = parseFee(drFees) + parseFee(medFees);
                                  const bothNil = drFees?.toLowerCase() === 'nil' && medFees?.toLowerCase() === 'nil';
                                  setOpFees(prev => ({ ...prev, [entry.rxId]: { drFees, medFees, total: bothNil ? 'Nil' : (total > 0 ? total : '') } }));
                                }}
                                onBlur={async () => {
                                  const feeData = opFees[entry.rxId];
                                  await databaseService.saveFees(entry.mrn, selectedDate, entry.name, feeData.drFees, feeData.medFees, entry.rxId);
                                }}
                                style={{ width: '80px', padding: '2px 6px', border: '1px solid #e9d5ff', borderRadius: 4, fontSize: '0.8rem', background: '#faf5ff', color: '#6b21a8', fontWeight: 600, textAlign: 'center' }}
                              />
                            </td>
                            <td className="fee-td" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                              <span style={{ padding: '2px 8px', display: 'inline-block', fontWeight: 800, color: '#dc2626', background: opFees[entry.rxId]?.total ? '#fef2f2' : 'transparent', borderRadius: 4, textAlign: 'center', minWidth: 60 }}>
                                {opFees[entry.rxId]?.total === 'Nil' ? 'Nil' : opFees[entry.rxId]?.total ? `₹${opFees[entry.rxId].total}` : '—'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '0 6px' }}>
                              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                <span style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: visitColor.bg, border: `2px solid ${visitColor.border}`, borderRadius: '50%', fontWeight: 900, fontSize: '0.85rem', color: visitColor.text, lineHeight: 1 }}>
                                  {visitCount}
                                </span>
                                <span style={{ fontSize: '0.58rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>visit{visitCount > 1 ? 's' : ''}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                <button
                                  onClick={() => {
                                    setEditingPatient({
                                      mrn: entry.mrn,
                                      patientName: entry.name || entry.patient_name || '',
                                      age: entry.age || '',
                                      gender: entry.sex || 'Male',
                                      phone: entry.phone || '',
                                      weight: entry.last_weight || '',
                                      bp: entry.last_bp || '',
                                      pulse: entry.last_pulse || '',
                                      temp: entry.last_temp || ''
                                    });
                                    setIsEditModalOpen(true);
                                  }}
                                  style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Edit Patient Info"
                                >✏️ Edit</button>
                                {pendingDeleteMrn === entry.rxId ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>Sure?</span>
                                    <button onClick={() => handleDeleteOPVisit(entry.rxId)} style={{ background: '#ef4444', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.72rem', color: 'white', fontWeight: 700 }}>Yes</button>
                                    <button onClick={() => setPendingDeleteMrn(null)} style={{ background: '#e2e8f0', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>No</button>
                                  </span>
                                ) : (
                                  <button onClick={() => setPendingDeleteMrn(entry.rxId)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Remove Visit">🗑️ Remove</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#1e3047', color: 'white' }}>
                        <td colSpan={8} style={{ padding: '10px 12px', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 0.3 }}>➤ CATEGORY TOTALS</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#86efac', background: 'rgba(22,163,74,0.1)' }}>
                          ₹{todayOPList.reduce((sum, entry) => { const v = opFees[entry.rxId]?.drFees; return sum + (v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0)); }, 0) || '0'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, fontSize: '0.9rem', color: '#c4b5fd', background: 'rgba(124,58,237,0.1)' }}>
                          ₹{todayOPList.reduce((sum, entry) => { const v = opFees[entry.rxId]?.medFees; return sum + (v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0)); }, 0) || '0'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: '#fca5a5', background: 'rgba(220,38,38,0.25)', borderRadius: 4 }}>
                          ₹{todayOPList.reduce((sum, entry) => { const v = opFees[entry.rxId]?.total; return sum + (v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0)); }, 0) || '0'}
                        </td>
                        <td style={{ padding: '10px 8px' }}></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            );
          })()}
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
                          readOnly
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}
                          placeholder="Doctor Name..."
                        />
                      </td>
                      <td>
                        <input
                          value={user.qualification || ''}
                          readOnly
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}
                          placeholder="MBBS, MD..."
                        />
                      </td>
                      <td>
                        <input
                          value={user.consultant || ''}
                          readOnly
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}
                          placeholder="Consultant..."
                        />
                      </td>
                      <td>
                        <input
                          value={user.reg_no || user.regNo || ''}
                          readOnly
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}
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
                          readOnly
                          style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}
                          placeholder="Password..."
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setEditingDoctorAccount({
                                id: user.id,
                                name: user.name || '',
                                phone: user.phone || '',
                                password: user.password || '',
                                qualification: user.qualification || '',
                                consultant: user.consultant || '',
                                reg_no: user.reg_no || user.regNo || ''
                              });
                              setIsDoctorAccountEditModalOpen(true);
                            }}
                            className="excel-del-row"
                            style={{ color: '#2563eb' }}
                            title="Edit Doctor Account"
                          >
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteUser(user.id)} className="excel-del-row" title="Delete Account">×</button>
                        </div>
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

            // OPTIMIZATION: Pre-group prescriptions by MRN for O(1) lookup in loop
            const rxCounts = {};
            allPrescriptions.forEach(rx => {
              const m = String(rx.mrn).trim();
              if (!rxCounts[m]) rxCounts[m] = 0;

              let meds = [];
              try { meds = JSON.parse(rx.medicines || '[]'); } catch (e) { meds = []; }
              const hasData = (Array.isArray(meds) && meds.length > 0) ||
                !!(rx.diagnosis && rx.diagnosis.trim()) ||
                !!(rx.complaints && rx.complaints.trim()) ||
                !!(rx.advice && rx.advice.trim());

              if (hasData) rxCounts[m]++;
            });

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
                      <th>Date</th>
                      <th>Weight</th>
                      <th>BP</th>
                      <th>Pulse</th>
                      <th>Temp</th>
                      <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((p, idx) => {
                      const visitsCount = rxCounts[String(p.mrn).trim()] || 0;
                      return (
                        <React.Fragment key={p.mrn}>
                          <tr style={{ height: '28px' }}>
                            <td className="row-num-col">{idx + 1}</td>
                            <td><span style={{ padding: '0 8px', display: 'block', fontWeight: 700, color: '#2563eb' }}>{p.mrn}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.name}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.age}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.sex}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.phone}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block', whiteSpace: 'nowrap', fontSize: '0.7rem', lineHeight: 1.4 }}>
                              {(() => {
                                // Prefer registration_date (static) for the table view
                                if (p.registration_date) {
                                  // registration_date may include time e.g. "2026-06-07 18:03"
                                  const parts = p.registration_date.split(' ');
                                  const dateVal = parts[0];
                                  const timeVal = parts[1];

                                  // Format date properly if it's YYYY-MM-DD
                                  let displayDate = dateVal;
                                  if (dateVal.includes('-')) {
                                    const [y, m, d] = dateVal.split('-');
                                    if (y.length === 4) displayDate = `${d}/${m}/${y}`;
                                  }

                                  return <>{displayDate}{timeVal ? <><br /><span style={{ color: '#6366f1', fontWeight: 700 }}>{timeVal}</span></> : null}</>;
                                } else if (p.updated_at) {
                                  // Fallback to updated_at if registration_date is missing
                                  const dt = new Date(p.updated_at);
                                  const datePart = dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                  const timePart = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                  return <>{datePart}<br /><span style={{ color: '#6366f1', fontWeight: 700 }}>{timePart}</span></>;
                                }
                                return '---';
                              })()}
                            </span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.last_weight}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.last_bp}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.last_pulse}</span></td>
                            <td><span style={{ padding: '0 8px', display: 'block' }}>{p.last_temp}</span></td>
                            <td style={{ textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                {visitsCount > 0 && (
                                  <button
                                    onClick={() => { setModalPatient(p); setSelectedRxIndex(0); }}
                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    title="View Prescription History"
                                  >
                                    📋 {visitsCount}
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingPatient({
                                      mrn: p.mrn,
                                      patientName: p.name || '',
                                      age: p.age || '',
                                      gender: p.sex || 'Male',
                                      phone: p.phone || '',
                                      weight: p.last_weight || '',
                                      bp: p.last_bp || '',
                                      pulse: p.last_pulse || '',
                                      temp: p.last_temp || '',
                                      registration_date: (p.registration_date || '').split(' ')[0]
                                    });
                                    setIsEditModalOpen(true);
                                  }}
                                  style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', color: '#d97706', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                  title="Edit Patient Info"
                                >
                                  ✏️ Edit
                                </button>
                                {pendingDeletePatientMrn === p.mrn ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>Delete?</span>
                                    <button
                                      onClick={() => handleDeletePatient(p.mrn)}
                                      style={{ background: '#ef4444', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.72rem', color: 'white', fontWeight: 700 }}
                                    >Yes</button>
                                    <button
                                      onClick={() => setPendingDeletePatientMrn(null)}
                                      style={{ background: '#e2e8f0', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}
                                    >No</button>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setPendingDeletePatientMrn(p.mrn)}
                                    style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                    title="Delete Patient"
                                  >
                                    🗑️ Delete
                                  </button>
                                )}
                              </div>
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

          {activeTab === 'monthly' && (() => {
            const year = parseInt(selectedMonth.split('-')[0]);
            const month = parseInt(selectedMonth.split('-')[1]);
            const daysInMonth = new Date(year, month, 0).getDate();

            const monthlyData = [];
            const docGroups = {};
            let grandTotalDr = 0;
            let grandTotalMed = 0;

            const monthRx = allPrescriptions.filter(rx => rx.date && rx.date.startsWith(selectedMonth));

            monthRx.forEach(rx => {
              const dName = rx.doctor_name || 'Unassigned';
              if (!docGroups[dName]) docGroups[dName] = { count: 0, dr: 0, med: 0 };
              const df = rx.dr_fees?.toString().toLowerCase();
              const mf = rx.med_fees?.toString().toLowerCase();
              docGroups[dName].count++;
              const drVal = (df === 'nil' ? 0 : (parseFloat(rx.dr_fees) || 0));
              const medVal = (mf === 'nil' ? 0 : (parseFloat(rx.med_fees) || 0));
              docGroups[dName].dr += drVal;
              docGroups[dName].med += medVal;
              grandTotalDr += drVal;
              grandTotalMed += medVal;
            });

            Object.keys(docGroups).sort().forEach(dName => {
              const g = docGroups[dName];
              monthlyData.push({
                doctorName: dName,
                count: g.count,
                drFees: g.dr,
                medFees: g.med,
                total: g.dr + g.med
              });
            });

            return (
              <div className="grid-container">
                <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '5px' }}>SELECT MONTH:</label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                    />
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        const reportHtml = `
                            <html>
                              <head>
                                <title>Monthly Collection Report - ${selectedMonth}</title>
                                <style>
                                  body { font-family: sans-serif; padding: 40px; color: #334155; }
                                  table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                                  th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                                  th { background: #f8fafc; color: #64748b; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
                                  .total-row { font-weight: bold; background: #f1f5f9; }
                                  h1 { text-align: center; margin-bottom: 5px; color: #1e293b; }
                                  h2 { text-align: center; color: #64748b; margin-top: 0; font-size: 1.1rem; }
                                  .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                                  .sig { border-top: 1px solid #334155; width: 200px; text-align: center; padding-top: 10px; }
                                </style>
                              </head>
                              <body>
                                <h1>${clinicSettings.name}</h1>
                                <h2>MONTHLY COLLECTION REPORT: ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Doctor Name</th>
                                      <th style="text-align: center;">Total Visits</th>
                                      <th style="text-align: right;">Dr Fees (₹)</th>
                                      <th style="text-align: right;">Medicine Fees (₹)</th>
                                      <th style="text-align: right;">Grand Total (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${monthlyData.map(d => `
                                      <tr>
                                        <td>${d.doctorName}</td>
                                        <td style="text-align: center;">${d.count}</td>
                                        <td style="text-align: right;">${d.drFees.toLocaleString()}</td>
                                        <td style="text-align: right;">${d.medFees.toLocaleString()}</td>
                                        <td style="text-align: right;">${d.total.toLocaleString()}</td>
                                      </tr>
                                    `).join('')}
                                  </tbody>
                                  <tfoot>
                                    <tr class="total-row">
                                      <td>MONTHLY TOTAL</td>
                                      <td style="text-align: center;">${monthlyData.reduce((s, d) => s + d.count, 0)}</td>
                                      <td style="text-align: right;">₹${grandTotalDr.toLocaleString()}</td>
                                      <td style="text-align: right;">₹${grandTotalMed.toLocaleString()}</td>
                                      <td style="text-align: right;">₹${(grandTotalDr + grandTotalMed).toLocaleString()}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                                <div class="footer">
                                  <div class="sig">Prepared By</div>
                                  <div class="sig">Authorized Signature</div>
                                </div>
                              </body>
                            </html>
                          `;
                        printWindow.document.write(reportHtml);
                        printWindow.document.close();
                        setTimeout(() => {
                          printWindow.print();
                        }, 500);
                      }}
                      className="excel-add-btn"
                      style={{ background: '#6366f1' }}
                    >
                      🖨️ Print Monthly Report
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  <table className="excel-table">
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '15px', textAlign: 'left' }}>Doctor Name</th>
                        <th style={{ textAlign: 'center', padding: '15px' }}>Monthly Visits</th>
                        <th style={{ textAlign: 'center', padding: '15px' }}>Dr Fees (₹)</th>
                        <th style={{ textAlign: 'center', padding: '15px' }}>Medicine Fees (₹)</th>
                        <th style={{ textAlign: 'center', padding: '15px' }}>Grand Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody style={{ fontSize: '0.9rem' }}>
                      {monthlyData.map((d, idx) => (
                        <tr key={idx} style={{
                          background: idx % 2 === 0 ? '#fff' : '#fcfcfc',
                          transition: 'all 0.2s'
                        }}>
                          <td style={{ padding: '12px 15px', color: '#1e293b', fontWeight: 600 }}>{d.doctorName}</td>
                          <td style={{ textAlign: 'center', padding: '12px 15px', color: '#64748b', fontWeight: 700 }}>{d.count || '-'}</td>
                          <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600, padding: '12px 15px' }}>{d.drFees ? d.drFees.toLocaleString() : '-'}</td>
                          <td style={{ textAlign: 'center', color: '#9333ea', fontWeight: 600, padding: '12px 15px' }}>{d.medFees ? d.medFees.toLocaleString() : '-'}</td>
                          <td style={{
                            textAlign: 'center',
                            color: '#dc2626',
                            fontWeight: 700,
                            padding: '12px 15px',
                            background: d.total > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                          }}>
                            {d.total ? `₹${d.total.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#1e293b', color: 'white', fontWeight: 800 }}>
                        <td style={{ padding: '20px 15px' }}>MONTHLY SUMMARY</td>
                        <td style={{ textAlign: 'center', padding: '20px 15px' }}>{monthlyData.reduce((s, d) => s + d.count, 0)}</td>
                        <td style={{ textAlign: 'center', color: '#4ade80', padding: '20px 15px' }}>₹{grandTotalDr.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: '#c084fc', padding: '20px 15px' }}>₹{grandTotalMed.toLocaleString()}</td>
                        <td style={{ textAlign: 'center', background: '#ef4444', fontSize: '1.2rem', padding: '20px 15px', borderRadius: '0 0 12px 0' }}>₹{(grandTotalDr + grandTotalMed).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
                    <input value={clinicSettings.name} onChange={(e) => setClinicSettings({ ...clinicSettings, name: e.target.value })} />
                  </div>
                  <div className="grid-field">
                    <label>Contact Info & Phone Numbers</label>
                    <textarea rows="4" value={clinicSettings.phone} onChange={(e) => setClinicSettings({ ...clinicSettings, phone: e.target.value })} />
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
        // Filter out auto-created stubs (assigned doctor only, no real prescription content)
        const patientRxs = modalPatientHistory.filter(rx => {
          let meds = [];
          try { meds = JSON.parse(rx.medicines || '[]'); } catch (e) { }
          const hasMedicines = Array.isArray(meds) && meds.length > 0;
          const hasDiagnosis = !!(rx.diagnosis && rx.diagnosis.trim());
          const hasComplaints = !!(rx.complaints && rx.complaints.trim());
          const hasAdvice = !!(rx.advice && rx.advice.trim());
          // Keep only real prescriptions that have at least some content
          return hasMedicines || hasDiagnosis || hasComplaints || hasAdvice;
        });
        const activeRx = patientRxs[selectedRxIndex];
        let previewData = null;
        if (activeRx) {
          const docInfo = users.find(u => u.name === activeRx.doctor_name) || {};
          let vitals = {};
          try { vitals = JSON.parse(activeRx.vitals || '{}'); } catch (e) { }
          let meds = [];
          try { meds = JSON.parse(activeRx.medicines || '[]'); } catch (e) { }

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
                            '@page { margin: 0; }' +
                            '* { box-sizing: border-box; margin: 0; padding: 0; }' +
                            'body { background: #e8edf2; font-family: \'Noto Sans Tamil\', sans-serif; }' +
                            '#print-toolbar { position: sticky; top: 0; z-index: 100; background: #1565C0; display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; color: white; }' +
                            '#print-toolbar button { background: white; color: #1565C0; border: none; padding: 8px 22px; border-radius: 6px; font-weight: 700; cursor: pointer; }' +
                            '#paper-wrapper { display: flex; justify-content: center; padding: 30px; }' +
                            '#prescription-paper { width: 210mm; min-height: 297mm; background: white; padding: 1.2cm 1.2cm; box-shadow: 0 4px 30px rgba(0,0,0,0.1); }' +
                            '@media print { #print-toolbar { display: none !important; } body { background: white !important; } #paper-wrapper { padding: 0 !important; } #prescription-paper { box-shadow: none !important; padding-top: 1cm !important; margin: 0 !important; } }' +
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

      {/* ── Quick Doctor Edit Modal ── */}
      {isDoctorEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '450px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', whiteSpace: 'nowrap' }}>Manage Doctor List</h3>
              <button onClick={() => setIsDoctorEditModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Add New Doctor Name:</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={editingDoctorName}
                    onChange={(e) => setEditingDoctorName(e.target.value.toUpperCase())}
                    placeholder="E.g. DR. JOHN DOE"
                    style={{ flex: 1, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        if (!editingDoctorName.trim()) return;
                        await databaseService.saveDoctor({ name: editingDoctorName });
                        setEditingDoctorName('');
                        await fetchAllData();
                      }
                    }}
                  />
                  <button
                    onClick={async () => {
                      if (!editingDoctorName.trim()) return;
                      await databaseService.saveDoctor({ name: editingDoctorName });
                      setEditingDoctorName('');
                      await fetchAllData();
                    }}
                    style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ADD
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}>
                {users.map((u, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: idx === users.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155' }}>{u.name}</span>
                    <button
                      onClick={async () => {
                        if (confirm(`Remove ${u.name}?`)) {
                          await databaseService.deleteDoctor(u.name);
                          await fetchAllData();
                        }
                      }}
                      style={{ background: '#fee2e2', color: '#ef4444', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>×</span>
                    </button>
                  </div>
                ))}

                {users.length === 0 && (
                  <div style={{ padding: '30px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 10px 0' }}>No doctors listed.</p>
                    <button
                      onClick={async () => {
                        if (confirm("This will remove all current names and replace them with the 5 default doctors. Continue?")) {
                          // 1. Delete all existing from DB (by name)
                          for (const u of users) {
                            await databaseService.deleteDoctor(u.name);
                          }
                          // 2. Add the 5 correct ones
                          const defaults = ["DR. UMA MAHESHWARAN", "DR. PRAGADEESH", "DR.G.GOPINATH", "DR.G.VIGNESH", "DR.SWAMINATHAN"];
                          for (const name of defaults) {
                            await databaseService.saveDoctor({ name });
                          }
                          await fetchAllData();
                        }
                      }}
                      style={{ fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Restore Defaults
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc' }}>
              <button onClick={() => setIsDoctorEditModalOpen(false)} style={{ margin: 0, padding: '8px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Doctor Account Edit Modal ── */}
      {isDoctorAccountEditModalOpen && (
        <div className="admin-modal-overlay">
          <div className="registration-modal-content">
            <div className="registration-modal-header">
              <h2>Edit Doctor Account</h2>
              <button className="registration-close-btn" onClick={() => setIsDoctorAccountEditModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleEditDoctorAccount} className="registration-form">
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingDoctorAccount.name}
                    onChange={(e) => setEditingDoctorAccount({ ...editingDoctorAccount, name: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={editingDoctorAccount.phone}
                    onChange={(e) => setEditingDoctorAccount({ ...editingDoctorAccount, phone: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Login Password *</label>
                  <input
                    type="text"
                    required
                    value={editingDoctorAccount.password}
                    onChange={(e) => setEditingDoctorAccount({ ...editingDoctorAccount, password: e.target.value })}
                  />
                </div>
                <div className="form-field full-width">
                  <label>Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. MBBS, MD"
                    value={editingDoctorAccount.qualification}
                    onChange={(e) => setEditingDoctorAccount({ ...editingDoctorAccount, qualification: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Consultant Role</label>
                  <input
                    type="text"
                    placeholder="e.g. General Physician"
                    value={editingDoctorAccount.consultant}
                    onChange={(e) => setEditingDoctorAccount({ ...editingDoctorAccount, consultant: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Registry Number</label>
                  <input
                    type="text"
                    placeholder="e.g. Reg No. 12345"
                    value={editingDoctorAccount.reg_no}
                    onChange={(e) => setEditingDoctorAccount({ ...editingDoctorAccount, reg_no: e.target.value })}
                  />
                </div>
              </div>

              <div className="registration-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsDoctorAccountEditModalOpen(false)} disabled={isActionBusy}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={isActionBusy}>
                  {isActionBusy ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Pick Existing Patient Modal ── */}
      {isPickPatientModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: 'white', width: '90%', maxWidth: '600px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Add Patient to Today's List</h3>
              <button onClick={() => setIsPickPatientModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <input
                type="text"
                placeholder="Search by name or MRN..."
                value={pickPatientSearch}
                onChange={(e) => setPickPatientSearch(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {patients.filter(p => {
                const searchLower = pickPatientSearch.toLowerCase();
                return p.name?.toLowerCase().includes(searchLower) || p.mrn?.toString().includes(searchLower);
              }).map((p, idx) => {
                // Check if already in today's list
                const isAlreadyAdded = prescriptions.some(rx => String(rx.mrn).trim() === String(p.mrn).trim() && rx.date === selectedDate);
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #f1f5f9', opacity: isAlreadyAdded ? 0.6 : 1 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#2563eb' }}>MRN: {p.mrn}</div>
                      <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 600 }}>{p.name}</div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const btn = e.currentTarget;
                        const originalText = btn.innerText;
                        btn.innerText = 'adding...';
                        btn.disabled = true;
                        try {
                          await handleAssignDoctor(p.mrn, p.name, '');
                          setIsPickPatientModalOpen(false);
                        } catch (err) {
                          btn.innerText = originalText;
                          btn.disabled = false;
                        }
                      }}
                      style={{
                        padding: '6px 15px',
                        background: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {isAlreadyAdded ? 'Add Again' : 'Add to Today'}
                    </button>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc' }}>
              <button onClick={() => setIsPickPatientModalOpen(false)} style={{ margin: 0, padding: '8px 20px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Patient ID / MRN *</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMRN = getNextAutomationMRN(patients);
                        setNewPatient({ ...newPatient, mrn: nextMRN });
                      }}
                      style={{ background: '#e0f2fe', border: 'none', borderRadius: 4, color: '#0369a1', fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      🤖 Auto-generate (123456789)
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter Unique Patient ID or MRN (or type 'automation')..."
                    value={newPatient.mrn}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.toLowerCase() === 'automation') {
                        const nextMRN = getNextAutomationMRN(patients);
                        setNewPatient({ ...newPatient, mrn: nextMRN });
                      } else {
                        setNewPatient({ ...newPatient, mrn: val });
                      }
                    }}
                  />
                  {newPatient.mrn && patients.some(p => p.mrn.toString() === newPatient.mrn.toString()) && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, marginTop: '2px' }}>
                      ⚠️ This MRN is already registered to a patient.
                    </span>
                  )}
                </div>
                <div className="form-field full-width">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Registration Date</label>
                    <button
                      type="button"
                      onClick={() => setNewPatient({ ...newPatient, date: new Date().toLocaleDateString('en-CA') })}
                      style={{ background: '#ecfdf5', border: 'none', borderRadius: 4, color: '#059669', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      🚀 Today
                    </button>
                  </div>
                  <input
                    type="date"
                    value={newPatient.date}
                    onChange={(e) => setNewPatient({ ...newPatient, date: e.target.value })}
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
                  {newPatient.patientName && newPatient.patientName.length > 3 && patients.some(p => p.name?.toLowerCase().trim() === newPatient.patientName.toLowerCase().trim()) && (
                    <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, marginTop: '2px' }}>
                      💡 A patient with this name is already registered.
                    </span>
                  )}
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
                    required
                    onChange={(e) => {
                      const newGender = e.target.value;
                      const updatedName = applyGenderPrefix(newPatient.patientName, newGender);
                      setNewPatient({ ...newPatient, gender: newGender, patientName: updatedName });
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-field full-width">
                  <label>Contact Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Enter Phone Number..."
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  />
                  {newPatient.phone && newPatient.phone.length >= 10 && patients.some(p => p.phone === newPatient.phone) && (
                    <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, marginTop: '2px' }}>
                      💡 This phone number is already registered to another patient.
                    </span>
                  )}
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

      {/* ── Patient Edit Modal ── */}
      {isEditModalOpen && (
        <div className="admin-modal-overlay">
          <div className="registration-modal-content">
            <div className="registration-modal-header">
              <h2>Edit Patient Record</h2>
              <button className="registration-close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleEditPatient} className="registration-form">
              <div className="form-grid">
                <div className="form-field full-width">
                  <label>Patient ID / MRN (Cannot be changed)</label>
                  <input
                    type="text"
                    disabled
                    style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', border: '1px solid #cbd5e1' }}
                    value={editingPatient.mrn}
                  />
                </div>
                <div className="form-field full-width">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Registration Date</label>
                    <button
                      type="button"
                      onClick={() => setEditingPatient({ ...editingPatient, registration_date: new Date().toLocaleDateString('en-CA') })}
                      style={{ background: '#ecfdf5', border: 'none', borderRadius: 4, color: '#059669', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}
                    >
                      🚀 Today
                    </button>
                  </div>
                  <input
                    type="date"
                    value={editingPatient.registration_date}
                    onChange={(e) => setEditingPatient({ ...editingPatient, registration_date: e.target.value })}
                  />
                </div>
                <div className="form-field full-width">
                  <label>Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Patient's Full Name..."
                    value={editingPatient.patientName}
                    onChange={(e) => setEditingPatient({ ...editingPatient, patientName: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Age</label>
                  <input
                    type="number"
                    placeholder="Age..."
                    value={editingPatient.age}
                    onChange={(e) => setEditingPatient({ ...editingPatient, age: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Gender / Sex</label>
                  <select
                    value={editingPatient.gender}
                    required
                    onChange={(e) => {
                      const newGender = e.target.value;
                      const updatedName = applyGenderPrefix(editingPatient.patientName, newGender);
                      setEditingPatient({ ...editingPatient, gender: newGender, patientName: updatedName });
                    }}
                  >
                    <option value="">Select Gender</option>
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
                    value={editingPatient.phone}
                    onChange={(e) => setEditingPatient({ ...editingPatient, phone: e.target.value })}
                  />
                </div>

                <div className="form-divider full-width">Vitals & Physical Metrics</div>

                <div className="form-field">
                  <label>Weight (kg)</label>
                  <input
                    type="text"
                    placeholder="e.g. 70"
                    value={editingPatient.weight}
                    onChange={(e) => setEditingPatient({ ...editingPatient, weight: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Blood Pressure (BP)</label>
                  <input
                    type="text"
                    placeholder="e.g. 120/80"
                    value={editingPatient.bp}
                    onChange={(e) => setEditingPatient({ ...editingPatient, bp: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Pulse Rate (bpm)</label>
                  <input
                    type="text"
                    placeholder="e.g. 72"
                    value={editingPatient.pulse}
                    onChange={(e) => setEditingPatient({ ...editingPatient, pulse: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Temperature (°F)</label>
                  <input
                    type="text"
                    placeholder="e.g. 98.6"
                    value={editingPatient.temp}
                    onChange={(e) => setEditingPatient({ ...editingPatient, temp: e.target.value })}
                  />
                </div>
              </div>

              <div className="registration-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={isSyncing}>
                  {isSyncing ? 'Saving Changes...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
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

        .doctor-chip-btn {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .doctor-chip-btn:hover {
          background: #eff6ff !important;
          border-color: #3b82f6 !important;
          color: #1d4ed8 !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
        }
        .doctor-chip-btn:active {
          transform: translateY(0);
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
        .excel-content { flex: 1; overflow-x: auto; overflow-y: auto; padding: 0; background: white; -webkit-overflow-scrolling: touch; }
        .grid-container { min-width: max-content; width: 100%; }
        .excel-table {
          min-width: 700px;
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 0.78rem;
        }
        .excel-table th {
          position: sticky;
          top: 0;
          background: #f9fafb;
          color: #4b5563;
          font-weight: 700;
          text-align: left;
          padding: 6px 10px;
          border-bottom: 2px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          z-index: 10;
          white-space: nowrap;
        }
        .excel-table td {
          border-bottom: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          padding: 0;
          vertical-align: middle;
          white-space: nowrap;
        }
        .fee-td {
          text-align: center !important;
          vertical-align: middle !important;
        }
        .fee-td input {
          width: 80px !important;
          display: inline-block !important;
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
          height: 28px;
          border: none;
          padding: 0 8px;
          background: transparent;
          outline: none;
          font-size: 0.8rem;
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
          font-size: 1rem;
          cursor: pointer;
          padding: 0;
          width: 100%;
          height: 28px;
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

          /* Mobile table scrolling */
          .excel-content {
            overflow-x: auto !important;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            padding: 0 !important;
          }
          .grid-container {
            min-width: max-content !important;
          }
          .excel-table {
            min-width: 750px !important;
            table-layout: auto !important;
          }
          .excel-table th {
            white-space: nowrap !important;
            font-size: 0.78rem !important;
            padding: 8px 10px !important;
          }
          .excel-table td {
            white-space: nowrap !important;
            padding: 0 !important;
          }
          .excel-table input, .excel-table select {
            min-width: 90px !important;
            width: 100% !important;
          }

          /* Modal Stack on Mobile */
          .admin-modal-content {
            flex-direction: column;
            height: 95vh;
            width: 100%;
            max-width: 100vw;
          }
          .admin-modal-sidebar {
            width: 100%;
            max-height: 170px;
            min-height: 130px;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
            flex-shrink: 0;
          }
          .sidebar-list {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 8px 10px;
          }
          .sidebar-item {
            margin-bottom: 0;
            flex-shrink: 0;
            width: 180px;
            padding: 8px 10px;
          }
          .modal-close-btn {
            display: none;
          }
          .sidebar-header {
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .sidebar-header h3 {
            font-size: 0.9rem;
          }
          .admin-modal-preview {
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .preview-toolbar {
            padding: 8px 12px;
            flex-direction: row;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            flex-shrink: 0;
          }
          .preview-toolbar .toolbar-actions {
            flex: 1;
          }
          .preview-toolbar .print-btn {
            width: 100%;
            justify-content: center;
          }

          /* Scale A4 to fit mobile width — fills the panel properly */
          .preview-paper-scroller {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .paper-scale-container {
            transform-origin: top center;
            /* 210mm ≈ 794px. A mobile width ~390px → scale ≈ 390/794 ≈ 0.49 */
            transform: scale(0.49);
            width: 210mm;
            /* compensate lost height so scroll works: margin-bottom = (scale - 1) * original_height */
            margin-bottom: calc((0.49 - 1) * 297mm);
            flex-shrink: 0;
          }
        }

        @media (max-width: 480px) {
          .paper-scale-container {
            /* Slightly smaller viewport: ~360px → scale ≈ 360/794 ≈ 0.45 */
            transform: scale(0.45);
            margin-bottom: calc((0.45 - 1) * 297mm);
          }
        }
      ` }} />
    </div >
  )
}

export default AdminDashboard
