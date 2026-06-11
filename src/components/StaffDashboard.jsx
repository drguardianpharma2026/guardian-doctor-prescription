import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { databaseService } from '../services/databaseService'
import PrescriptionPreview from './PrescriptionPreview'

const sortPatientsByMRN = (list) => {
    return [...list].sort((a, b) => {
        const numA = parseInt(a.mrn, 10);
        const numB = parseInt(b.mrn, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return String(b.mrn).localeCompare(String(a.mrn));
    });
};

const getNextAutomationMRN = (existingPatients) => {
    const numericMRNs = existingPatients
        .map(p => {
            const trimmed = p.mrn?.trim() || '';
            if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
            return NaN;
        })
        .filter(num => !isNaN(num) && num >= 0);
    if (numericMRNs.length > 0) {
        const maxMRN = Math.max(...numericMRNs);
        return (maxMRN + 1).toString();
    }
    return '1';
};

const applyGenderPrefix = (name, gender) => {
    if (!name) return "";
    let cleanName = name.replace(/^(MR\.|MRS\.|MS\.|MT\.)\s+/i, "").trim();
    if (gender === "Male") return `MR. ${cleanName}`;
    if (gender === "Female") return `MRS. ${cleanName}`;
    return cleanName;
};

const StaffDashboard = () => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('todayop')
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)

    const [patients, setPatients] = useState([])
    const [prescriptions, setPrescriptions] = useState([])
    const [allPrescriptions, setAllPrescriptions] = useState([])
    const [users, setUsers] = useState([])
    const [savedDoctors, setSavedDoctors] = useState([])

    const [modalPatient, setModalPatient] = useState(null)
    const [modalPatientHistory, setModalPatientHistory] = useState([])
    const [selectedRxIndex, setSelectedRxIndex] = useState(0)

    const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'))
    const [filterDoctor, setFilterDoctor] = useState('ALL DOCTORS')

    // Modals
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isPickPatientModalOpen, setIsPickPatientModalOpen] = useState(false)
    const [pickPatientSearch, setPickPatientSearch] = useState('')

    const INITIAL_NEW_PATIENT = {
        mrn: '', patientName: '', age: '', gender: '', phone: '',
        weight: '', bp: '', pulse: '', temp: '', date: new Date().toLocaleDateString('en-CA')
    };

    const [newPatient, setNewPatient] = useState(INITIAL_NEW_PATIENT)
    const [editingPatient, setEditingPatient] = useState({
        mrn: '', patientName: '', age: '', gender: 'Male', phone: '',
        weight: '', bp: '', pulse: '', temp: '', registration_date: ''
    })

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [assignTarget, setAssignTarget] = useState(null)
    const [opFees, setOpFees] = useState({}) // { [rxId]: { drFees, medFees, labGiven, labCash, total } }

    const refreshData = useCallback(async () => {
        setIsSyncing(true)
        try {
            const [dbPatients, dbRx, dbAllRx, dbUsers, dbSavedDoctors] = await Promise.all([
                databaseService.getAllPatients(),
                databaseService.getPrescriptions(null, selectedDate),
                databaseService.getPrescriptions(null, null),
                databaseService.getUsers(),
                databaseService.getSavedDoctors()
            ])
            if (dbPatients) setPatients(sortPatientsByMRN(dbPatients))
            if (dbRx) {
                setPrescriptions(dbRx)
                const initialFees = {};
                dbRx.forEach(rx => {
                    const drFees = rx.dr_fees || '';
                    const medFees = rx.med_fees || '';
                    const labGiven = rx.lab_given || '';
                    const labCash = rx.lab_cash || '';
                    const parseFee = v => v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0);
                    const total = parseFee(drFees) + parseFee(medFees) + parseFee(labGiven) + parseFee(labCash);
                    const allNil = drFees?.toLowerCase() === 'nil' && medFees?.toLowerCase() === 'nil' && labGiven?.toLowerCase() === 'nil' && labCash?.toLowerCase() === 'nil';
                    const rid = rx.id?.toString();
                    initialFees[rid] = { drFees, medFees, labGiven, labCash, total: allNil ? 'Nil' : (total > 0 ? total : '') };
                });
                setOpFees(initialFees);
            }
            if (dbAllRx) setAllPrescriptions(dbAllRx)
            if (dbUsers) setUsers(dbUsers)
            if (dbSavedDoctors) setSavedDoctors(dbSavedDoctors)
        } catch (e) {
            console.error(e)
        } finally {
            setIsSyncing(false)
        }
    }, [selectedDate])

    useEffect(() => {
        refreshData()
        const interval = setInterval(refreshData, 30000)

        // Listen for sync events from other tabs (Admin Dashboard, etc.)
        const channel = new BroadcastChannel('nexusrx_sync')
        channel.onmessage = (msg) => {
            if (msg.data === 'refresh') refreshData()
        }

        return () => {
            clearInterval(interval)
            channel.close()
        }
    }, [refreshData])

    useEffect(() => {
        if (!modalPatient) {
            setModalPatientHistory([])
            return
        }
        const fetchHistory = async () => {
            try {
                const history = await databaseService.getPrescriptionsByMRN(modalPatient.mrn)
                if (history) setModalPatientHistory(history)
            } catch (err) { console.error(err) }
        }
        fetchHistory()
    }, [modalPatient])

    const handleAssignDoctor = async (mrn, pName, docName, rxId = null) => {
        setIsSyncing(true)
        try {
            const doc = users.find(u => u.name === docName) ||
                savedDoctors.find(d => d.name === docName) || {};
            await databaseService.savePrescription({
                id: rxId,
                mrn,
                patientName: pName,
                date: selectedDate,
                doctorName: docName,
                doctorRegNo: doc.regNo || doc.reg_no || ''
            })
            setIsPickPatientModalOpen(false)
            setPickPatientSearch('')
            setIsAssignModalOpen(false)
            await refreshData()
        } catch (e) {
            console.error(e)
            alert('Failed: ' + e.message)
        } finally {
            setIsSyncing(false)
        }
    }

    const handleDeleteVisit = async (rxId) => {
        if (!window.confirm('Remove this patient from today\'s list?')) return
        setIsSyncing(true)
        try {
            await databaseService.deletePrescription(rxId)
            await refreshData()
        } catch (e) {
            console.error(e)
            alert('Failed to delete: ' + e.message)
        } finally {
            setIsSyncing(false)
        }
    }


    const handleRegisterPatient = async (e) => {
        e.preventDefault()
        if (!newPatient.mrn || !newPatient.patientName) { alert('Required fields missing'); return; }
        setIsSyncing(true)
        try {
            const now = new Date()
            const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            const regDate = `${newPatient.date} ${timeStr}`
            await databaseService.savePatient({
                ...newPatient,
                last_weight: newPatient.weight, last_bp: newPatient.bp, last_pulse: newPatient.pulse, last_temp: newPatient.temp,
                registration_date: regDate
            })
            await databaseService.savePrescription({ mrn: newPatient.mrn, patientName: newPatient.patientName, date: selectedDate })
            setIsRegisterModalOpen(false)
            setNewPatient({ ...INITIAL_NEW_PATIENT, mrn: getNextAutomationMRN(patients) }) // Reset form after registration
            await refreshData()
        } catch (e) { alert(e.message) } finally { setIsSyncing(false) }
    }

    const handleEditPatient = async (e) => {
        e.preventDefault()
        setIsSyncing(true)
        try {
            await databaseService.savePatient({
                ...editingPatient,
                last_weight: editingPatient.weight, last_bp: editingPatient.bp, last_pulse: editingPatient.pulse, last_temp: editingPatient.temp
            })
            setIsEditModalOpen(false)
            await refreshData()
        } catch (e) { alert(e.message) } finally { setIsSyncing(false) }
    }

    const allDoctorNames = useMemo(() => {
        const uNames = users.filter(u => (u.role || '').toLowerCase().includes('doctor')).map(u => u.name);
        const sdNames = savedDoctors.map(d => d.name);
        const rxNames = allPrescriptions.map(rx => rx.doctor_name);

        // Normalize names to "DR. NAME" format to merge variations
        const formatName = (n) => {
            let clean = (n || '').trim().toUpperCase().replace(/^DR\.?\s*/i, '').trim();
            return clean ? `DR. ${clean}` : '';
        };

        const uniqueNames = Array.from(new Set([...uNames, ...sdNames, ...rxNames].map(formatName)))
            .filter(name => name && name !== "DR. UMA MAHESHWARAN" && name !== "DR. MUHSIN" && name !== "DR. ALL DOCTORS" && name !== "ALL DOCTORS");
        return uniqueNames.sort();
    }, [users, savedDoctors, allPrescriptions]);

    const todayOPListFiltered = useMemo(() => {
        return prescriptions.filter(rx => {
            const p = patients.find(pat => String(pat.mrn).trim() === String(rx.mrn).trim())
            const searchMatch = !searchTerm || (p?.name?.toLowerCase().includes(searchTerm.toLowerCase())) || (String(rx.mrn).includes(searchTerm))

            const normalize = (n) => (n || '').trim().toUpperCase().replace(/^DR\.?\s*/i, '').trim();
            const currentDoc = normalize(rx.doctor_name)
            const targetDoc = normalize(filterDoctor)
            const doctorMatch = filterDoctor === 'ALL DOCTORS' || currentDoc === targetDoc

            return searchMatch && doctorMatch
        }).map(rx => {
            const p = patients.find(pat => String(pat.mrn).trim() === String(rx.mrn).trim())
            return { ...p, ...rx, rxId: rx.id?.toString() }
        })
    }, [prescriptions, patients, searchTerm, filterDoctor])

    const patientRecordsFiltered = useMemo(() => {
        return patients.filter(p =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.mrn?.toString().includes(searchTerm)
        )
    }, [patients, searchTerm])


    return (
        <div className="excel-admin">
            <div className="sidebar-hover-indicator"></div>
            <div className="sidebar-hover-trigger" onMouseEnter={() => setIsSidebarOpen(true)}></div>

            <aside className={`excel-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`} onMouseLeave={() => { if (window.innerWidth > 768) setIsSidebarOpen(false) }}>
                <div className="excel-logo">
                    <img src="/logo.png" alt="Logo" style={{ width: 38, height: 38, borderRadius: 6 }} />
                    <span>Guardian Staff</span>
                    <button className="sidebar-close-x" onClick={() => setIsSidebarOpen(false)}>×</button>
                </div>
                <nav>
                    <button className={activeTab === 'todayop' ? 'active' : ''} onClick={() => setActiveTab('todayop')}>🩺 Today's OP</button>
                    <button className={activeTab === 'patients' ? 'active' : ''} onClick={() => setActiveTab('patients')}>🏥 Patient Records</button>
                </nav>
                <div className="sidebar-bottom">
                    <button onClick={() => navigate('/')} className="home-btn" style={{ width: '100%', padding: 10, background: '#475569', color: 'white', borderRadius: 6, cursor: 'pointer', border: 'none' }}>Website Home</button>
                </div>
            </aside>

            <main className="excel-main">
                <header className="excel-header" style={{ alignItems: 'center' }}>
                    <div className="header-left">
                        <button className="hamburger-menu" style={{ display: 'none' }} onClick={() => setIsSidebarOpen(true)}>☰</button>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{activeTab === 'todayop' ? "Today's OP List" : "Patient Records"}</h1>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                                {activeTab === 'todayop' ? `${todayOPListFiltered.length} Patients • ${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}` : `${patients.length} Patients registered`}
                            </p>
                        </div>
                    </div>
                    <div className="header-right" style={{ display: 'flex', gap: 12 }}>
                        <div className="excel-search">
                            <input placeholder="Search patients by name or MRN......" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: 300, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        </div>
                        {activeTab === 'todayop' ? (
                            <>
                                <button className="add-patient-btn" onClick={() => setIsPickPatientModalOpen(true)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+ Add Patient</button>
                                <button onClick={refreshData} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>🔄 Refresh</button>
                            </>
                        ) : (
                            <button className="register-patient-btn" onClick={() => {
                                setNewPatient({ ...INITIAL_NEW_PATIENT, mrn: getNextAutomationMRN(patients) });
                                setIsRegisterModalOpen(true);
                            }} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+ Register Patient</button>
                        )}
                    </div>
                </header>

                <div className="excel-content" style={{ padding: '8px 12px' }}>
                    {activeTab === 'todayop' && (
                        <div className="grid-container" style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
                            <div className="filter-bar" style={{ display: 'flex', gap: 12, padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' }}>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.5px' }}>DATE:</span>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem', outline: 'none', width: 'auto' }}
                                    />
                                </div>

                                <div style={{ width: '1px', height: '18px', background: '#e2e8f0', margin: '0 4px' }}></div>

                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>FILTER BY DOCTOR:</span>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        {['ALL DOCTORS', ...allDoctorNames].map(doc => (
                                            <button
                                                key={doc}
                                                onClick={() => setFilterDoctor(doc)}
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: 99,
                                                    border: filterDoctor === doc ? '1px solid transparent' : '1px solid #3b82f6',
                                                    background: filterDoctor === doc ? '#1e293b' : 'white',
                                                    color: filterDoctor === doc ? 'white' : '#2563eb',
                                                    fontWeight: 800,
                                                    fontSize: '0.65rem',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {doc.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <table className="excel-table staff-table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ width: 30, textAlign: 'center', padding: '6px 4px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>#</th>
                                        <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>TOKEN</th>
                                        <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>MRN</th>
                                        <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>PATIENT NAME</th>
                                        <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>AGE</th>
                                        <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>SEX</th>
                                        <th style={{ textAlign: 'left', padding: '6px 12px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>PHONE</th>
                                        <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>ATTENDING DOCTOR</th>

                                        <th style={{ width: 60, textAlign: 'center', padding: '6px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>VISITS</th>
                                        <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {todayOPListFiltered.map((p, idx) => {
                                        return (
                                            <tr key={p.rxId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', padding: '6px 4px' }}>{idx + 1}</td>
                                                <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    <span style={{ background: '#fef3c7', color: '#92400e', fontWeight: 900, padding: '2px 8px', borderRadius: 4, border: '1px solid #fde68a', fontSize: '0.7rem' }}>
                                                        {p.visit_no || `OP-${(idx + 1).toString().padStart(2, '0')}`}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    <span style={{ color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}>{p.mrn}</span>
                                                </td>
                                                <td style={{ fontWeight: 700, color: '#334155', padding: '6px 12px', fontSize: '0.8rem' }}>{p.name}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b', padding: '6px 8px', fontSize: '0.75rem' }}>{p.age}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b', padding: '6px 8px', fontSize: '0.75rem' }}>{p.sex}</td>
                                                <td style={{ color: '#64748b', fontSize: '0.75rem', padding: '6px 12px' }}>{p.phone}</td>
                                                <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    <div
                                                        onClick={() => { setAssignTarget(p); setIsAssignModalOpen(true); }}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#166534', padding: '3px 10px', borderRadius: 4, border: '1px solid #bbf7d0', fontWeight: 800, fontSize: '0.65rem', cursor: 'pointer' }}
                                                    >
                                                        {p.doctor_name || 'NOT ASSIGNED'}
                                                        <span style={{ color: '#f97316', fontSize: '0.8rem' }}>✎</span>
                                                    </div>
                                                </td>

                                                <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    {(() => {
                                                        const pRx = allPrescriptions.filter(rx => String(rx.mrn).trim() === String(p.mrn).trim());
                                                        const dates = new Set(pRx.map(rx => rx.date).filter(Boolean));
                                                        const vCount = dates.size;
                                                        const vColor = vCount === 1 ? '#15803d' : vCount === 2 ? '#1d4ed8' : '#b45309';
                                                        const vBg = vCount === 1 ? '#f0fdf4' : vCount === 2 ? '#eff6ff' : '#fef3c7';
                                                        return (
                                                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                                                <span style={{ display: 'flex', width: 22, height: 22, alignItems: 'center', justifyContent: 'center', background: vBg, border: `1.5px solid ${vColor}80`, borderRadius: '50%', fontWeight: 900, fontSize: '0.7rem', color: vColor }}>{vCount}</span>
                                                            </div>
                                                        )
                                                    })()}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => { setEditingPatient({ ...p, patientName: p.name, gender: p.sex }); setIsEditModalOpen(true); }}
                                                            style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleDeleteVisit(p.rxId)} style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#fef2f2', color: '#b91c1c', fontWeight: 700, fontSize: '0.65rem', cursor: 'pointer' }}>Remove</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>

                            </table>
                        </div>
                    )}

                    {activeTab === 'patients' && (
                        <div className="grid-container">
                            <table className="excel-table">
                                <thead>
                                    <tr>
                                        <th className="row-num-col">#</th>
                                        <th>MRN</th>
                                        <th>Patient Name</th>
                                        <th>Age</th>
                                        <th>Sex</th>
                                        <th>Phone</th>
                                        <th>Date</th>
                                        <th style={{ textAlign: 'center' }}>Weight</th>
                                        <th style={{ textAlign: 'center' }}>BP</th>
                                        <th style={{ textAlign: 'center' }}>Pulse</th>
                                        <th style={{ textAlign: 'center' }}>Temp</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patientRecordsFiltered.map((p, idx) => (
                                        <tr key={p.mrn}>
                                            <td className="row-num-col">{idx + 1}</td>
                                            <td style={{ fontWeight: 800, color: '#2563eb' }}>{p.mrn}</td>
                                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td>{p.age}</td>
                                            <td>{p.sex}</td>
                                            <td>{p.phone}</td>
                                            <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.registration_date ? p.registration_date.replace(' ', '\n') : '---'}</td>
                                            <td style={{ textAlign: 'center' }}>{p.last_weight}</td>
                                            <td style={{ textAlign: 'center' }}>{p.last_bp}</td>
                                            <td style={{ textAlign: 'center' }}>{p.last_pulse}</td>
                                            <td style={{ textAlign: 'center' }}>{p.last_temp}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                                    <button onClick={() => { setEditingPatient({ ...p, patientName: p.name, gender: p.sex }); setIsEditModalOpen(true); }} style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', fontWeight: 700, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>Edit</button>
                                                    <button onClick={async () => { if (window.confirm('Delete patient?')) { await databaseService.deletePatient(p.mrn); refreshData(); } }} style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', fontWeight: 700, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals: Register Patient */}
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
                                        placeholder="Enter Unique Patient ID or MRN..."
                                        value={newPatient.mrn}
                                        onChange={(e) => setNewPatient({ ...newPatient, mrn: e.target.value })}
                                    />
                                    {newPatient.mrn && patients.some(p => p.mrn.toString() === newPatient.mrn.toString()) && (
                                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, marginTop: '2px' }}>
                                            ⚠️ This MRN is already registered.
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
                                </div>

                                <div className="form-divider">Vitals & Physical Metrics</div>

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
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => {
                                        if (window.confirm("Reset all fields?")) {
                                            setNewPatient({ ...INITIAL_NEW_PATIENT, mrn: getNextAutomationMRN(patients) });
                                        }
                                    }}
                                    style={{ background: '#fff1f2', color: '#e11d48', border: '1px solid #fecdd3' }}
                                >
                                    🗑 Reset Form
                                </button>
                                <button type="submit" className="submit-btn" style={{ background: '#10b981' }}>🚀 Register & Add to List</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Pick Patient for Today */}
            {isPickPatientModalOpen && (
                <div className="admin-modal-overlay">
                    <div className="registration-modal-content" style={{ maxWidth: 500 }}>
                        <div className="registration-modal-header">
                            <h3>Add Existing Patient</h3>
                            <button className="registration-close-btn" onClick={() => { setIsPickPatientModalOpen(false); setPickPatientSearch(''); }}>×</button>
                        </div>
                        <div className="registration-form" style={{ padding: 20 }}>
                            <div className="form-field" style={{ marginBottom: 15 }}>
                                <label>Search Patient</label>
                                <input
                                    placeholder="Search MRN or Name..."
                                    value={pickPatientSearch}
                                    onChange={e => setPickPatientSearch(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                                {patients.filter(p => !pickPatientSearch || p.name.toLowerCase().includes(pickPatientSearch.toLowerCase()) || p.mrn.includes(pickPatientSearch)).map(p => (
                                    <div key={p.mrn} style={{ padding: '12px 15px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                                        <div>
                                            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{p.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>MRN: {p.mrn}</div>
                                        </div>
                                        <button
                                            onClick={() => handleAssignDoctor(p.mrn, p.name, 'ALL DOCTORS')}
                                            style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                                        >
                                            Add to List
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="registration-actions">
                                <button type="button" className="cancel-btn" style={{ width: '100%' }} onClick={() => { setIsPickPatientModalOpen(false); setPickPatientSearch(''); }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Edit Patient */}
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
                                    <input value={editingPatient.mrn} disabled style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }} />
                                </div>
                                <div className="form-field full-width">
                                    <label>Patient Name</label>
                                    <input value={editingPatient.patientName} onChange={e => setEditingPatient({ ...editingPatient, patientName: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>Age</label>
                                    <input value={editingPatient.age} onChange={e => setEditingPatient({ ...editingPatient, age: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>Gender</label>
                                    <select value={editingPatient.gender} onChange={e => setEditingPatient({ ...editingPatient, gender: e.target.value })}>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="form-field full-width">
                                    <label>Phone</label>
                                    <input value={editingPatient.phone} onChange={e => setEditingPatient({ ...editingPatient, phone: e.target.value })} />
                                </div>

                                <div className="form-divider">Vitals & Physical Metrics</div>

                                <div className="form-field">
                                    <label>Weight (kg)</label>
                                    <input value={editingPatient.weight} onChange={e => setEditingPatient({ ...editingPatient, weight: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>Blood Pressure (BP)</label>
                                    <input value={editingPatient.bp} onChange={e => setEditingPatient({ ...editingPatient, bp: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>Pulse Rate (bpm)</label>
                                    <input value={editingPatient.pulse} onChange={e => setEditingPatient({ ...editingPatient, pulse: e.target.value })} />
                                </div>
                                <div className="form-field">
                                    <label>Temperature (°F)</label>
                                    <input value={editingPatient.temp} onChange={e => setEditingPatient({ ...editingPatient, temp: e.target.value })} />
                                </div>
                            </div>
                            <div className="registration-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                                <button type="submit" className="submit-btn">💾 Update Patient</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Reassign Doctor */}
            {isAssignModalOpen && (
                <div className="admin-modal-overlay">
                    <div className="registration-modal-content" style={{ maxWidth: 400 }}>
                        <div className="registration-modal-header">
                            <h3>Reassign Doctor</h3>
                            <button className="registration-close-btn" onClick={() => setIsAssignModalOpen(false)}>×</button>
                        </div>
                        <div className="registration-form">
                            <p style={{ margin: '0 0 15px', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Assigning for: <strong>{assignTarget?.name}</strong></p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {['ALL DOCTORS', ...allDoctorNames].map(doc => (
                                    <button
                                        key={doc}
                                        onClick={() => handleAssignDoctor(assignTarget.mrn, assignTarget.name, doc, assignTarget.rxId)}
                                        style={{
                                            padding: '12px 15px',
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            background: 'white',
                                            textAlign: 'left',
                                            fontWeight: 700,
                                            fontSize: '0.85rem',
                                            color: '#1e293b',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f0f9ff'; }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = 'white'; }}
                                    >
                                        {doc}
                                        <span style={{ fontSize: '1rem', color: '#3b82f6' }}>➔</span>
                                    </button>
                                ))}
                            </div>
                            <div className="registration-actions">
                                <button type="button" className="cancel-btn" style={{ width: '100%' }} onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .excel-admin { display: flex; height: 100vh; background: #ffffff; font-family: 'Segoe UI', Tahoma, sans-serif; color: #1e293b; }
                .excel-sidebar { width: 240px; background: #1e293b; color: white; display: flex; flex-direction: column; padding: 20px 0; position: fixed; top: 0; left: 0; bottom: 0; z-index: 1500; transform: translateX(-100%); transition: transform 0.4s; }
                .excel-sidebar.mobile-open { transform: translateX(0); }
                .excel-logo { display: flex; align-items: center; gap: 12px; padding: 0 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.1); }
                .excel-logo span { font-weight: 800; font-size: 1.2rem; }
                .excel-sidebar nav { flex: 1; padding: 20px 10px; }
                .excel-sidebar nav button { display: block; width: 100%; text-align: left; background: none; border: none; color: #94a3b8; padding: 12px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-bottom: 4px; }
                .excel-sidebar nav button.active { background: #2563eb; color: white; }
                .excel-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                .excel-header { display: flex; justify-content: space-between; padding: 20px 30px; border-bottom: 1px solid #f1f5f9; background: white; }
                .excel-content { flex: 1; overflow: auto; background: white; }
                .excel-table { width: 100%; border-collapse: collapse; }
                .excel-table th { background: #f8fafc; color: #1e293b; font-weight: 800; text-align: left; padding: 12px 15px; border-bottom: 2px solid #e2e8f0; font-size: 0.72rem; text-transform: uppercase; }
                .excel-table td { padding: 8px 15px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
                .row-num-col { background: #f8fafc; color: #94a3b8; width: 40px; text-align: center !important; font-weight: 700; }
                .admin-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 20px; }
                .registration-modal-content { background: white; width: 100%; max-width: 650px; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); display: flex; flex-direction: column; overflow: hidden; animation: modalAppear 0.3s ease-out; }
                @keyframes modalAppear { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .registration-modal-header { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
                .registration-modal-header h2, .registration-modal-header h3 { margin: 0; font-size: 1.15rem; color: #0f172a; font-weight: 700; }
                .registration-close-btn { background: none; border: none; color: #64748b; font-size: 1.5rem; cursor: pointer; font-weight: 600; line-height: 1; }
                .registration-close-btn:hover { color: #ef4444; }
                .registration-form { padding: 20px 25px; overflow-y: auto; max-height: 75vh; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px 20px; }
                .form-field { display: flex; flex-direction: column; gap: 6px; }
                .form-field.full-width { grid-column: span 2; }
                .form-divider { grid-column: span 2; margin: 10px 0 5px; padding: 8px 12px; background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; color: #1d4ed8; font-weight: 800; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; }
                .form-field label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                .form-field input, .form-field select { padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.85rem; color: #1e293b; font-weight: 600; outline: none; transition: border-color 0.2s; }
                .form-field input:focus { border-color: #3b82f6; }
                .form-field input[readonly] { background: #f8fafc; color: #64748b; cursor: not-allowed; }
                .registration-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #f1f5f9; }
                .registration-actions button { padding: 10px 20px; border-radius: 6px; border: none; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
                .registration-actions .cancel-btn { background: #f1f5f9; color: #475569; }
                .registration-actions .submit-btn { background: #2563eb; color: white; }
                .registration-actions button:hover { opacity: 0.9; transform: translateY(-1px); }
                .sidebar-hover-indicator { position: fixed; left: 0; top: 50%; width: 6px; height: 70px; background: linear-gradient(180deg, #3b82f6, #2563eb); transform: translateY(-50%); border-radius: 0 6px 6px 0; opacity: 0.85; box-shadow: 2px 0 8px rgba(59,130,246,0.5); animation: pulseStrip 2s ease-in-out infinite; }
                @keyframes pulseStrip { 0%, 100% { opacity: 0.85; box-shadow: 2px 0 8px rgba(59,130,246,0.5); } 50% { opacity: 1; box-shadow: 2px 0 14px rgba(59,130,246,0.8); } }
                .sidebar-hover-trigger { position: fixed; left: 0; top: 0; width: 15px; height: 100vh; z-index: 1600; }
                .excel-admin tfoot { display: none !important; }
            ` }} />
        </div>
    )
}

export default StaffDashboard
