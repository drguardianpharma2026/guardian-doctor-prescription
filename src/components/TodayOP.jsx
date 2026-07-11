import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { databaseService } from '../services/databaseService'
import PrescriptionPreview from './PrescriptionPreview'

const sortPatientsByMRN = (list) =>
    [...list].sort((a, b) => {
        const nA = parseInt(a.mrn, 10), nB = parseInt(b.mrn, 10)
        if (!isNaN(nA) && !isNaN(nB)) return nB - nA
        return String(b.mrn).localeCompare(String(a.mrn))
    })

const getNextMRN = (patients) => {
    const nums = patients
        .map(p => parseInt(p.mrn, 10))
        .filter(n => !isNaN(n))
    return nums.length > 0 ? (Math.max(...nums) + 1).toString() : '1'
}

const EMPTY_PATIENT = { mrn: '', patientName: '', age: '', gender: '', phone: '', weight: '', bp: '', pulse: '', temp: '', date: new Date().toLocaleDateString('en-CA') }

export default function TodayOP() {
    const navigate = useNavigate()
    const [patients, setPatients] = useState([])
    const [allPatients, setAllPatients] = useState([])
    const [prescriptions, setPrescriptions] = useState([])
    const [users, setUsers] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)
    const [pendingRemoveMrn, setPendingRemoveMrn] = useState(null)
    const [opFees, setOpFees] = useState({}) // { [rxId]: { drFees, medFees, labGiven, labCash, total } }
    const opFeesRef = React.useRef({})
    useEffect(() => { opFeesRef.current = opFees }, [opFees])

    // Edit Modal
    const [editOpen, setEditOpen] = useState(false)
    const [editData, setEditData] = useState(EMPTY_PATIENT)

    // Register Modal
    const [regOpen, setRegOpen] = useState(false)
    const [regData, setRegData] = useState(EMPTY_PATIENT)

    // Prescription viewer
    const [modalPatient, setModalPatient] = useState(null)
    const [selectedRxIndex, setSelectedRxIndex] = useState(0)

    const todayStr = new Date().toLocaleDateString('en-IN')
    const todayFull = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const loadData = async () => {
        setIsSyncing(true)
        try {
            const [dbPatients, dbRx, dbUsers] = await Promise.all([
                databaseService.getAllPatients(),
                databaseService.getPrescriptions(),
                databaseService.getUsers(),
            ])
            const sorted = sortPatientsByMRN(dbPatients || [])
            setAllPatients(sorted)
            const today = new Date().toLocaleDateString('en-CA');
            const todayRx = (dbRx || []).filter(rx => rx.date === today);

            // Map prescriptions to patients to support multiple visits
            const opList = todayRx.map(rx => {
                const p = sorted.find(pat => String(pat.mrn).trim() === String(rx.mrn).trim()) || {};
                return {
                    ...p,
                    ...rx,
                    rxId: rx.id,
                    name: p.name || rx.patient_name || "Unknown Patient",
                    age: p.age || rx.age || "",
                    sex: p.sex || p.gender || rx.sex || "",
                    phone: p.phone || rx.phone || "",
                    place: p.place || rx.place || ""
                };
            });

            setPatients(opList);
            setPrescriptions(dbRx || [])
            setUsers(dbUsers || [])

            // Initialize opFees
            const initialFees = {};
            todayRx.forEach(rx => {
                const drFees = rx.dr_fees || '';
                const medFees = rx.med_fees || '';
                const labGiven = rx.lab_given || '';
                const labCash = rx.lab_cash || '';
                const parseFee = v => v?.toString().trim().toLowerCase() === 'nil' ? 0 : (parseFloat(v) || 0);
                const total = parseFee(drFees) + parseFee(medFees) + parseFee(labCash);
                const allNil = drFees?.toLowerCase() === 'nil' && medFees?.toLowerCase() === 'nil' && labCash?.toLowerCase() === 'nil';
                initialFees[rx.id?.toString()] = { drFees, medFees, labGiven, labCash, total: allNil ? 'Nil' : total };
            });
            setOpFees(prev => {
                const merged = { ...prev };
                const activeEl = document.activeElement;
                const focusedRxId = activeEl?.closest('tr')?.getAttribute('data-rx-id');

                Object.keys(initialFees).forEach(rid => {
                    if (rid === focusedRxId) return;
                    merged[rid] = initialFees[rid];
                });
                return merged;
            });
        } catch (err) {
            console.error(err)
        } finally {
            setIsSyncing(false)
        }
    }

    useEffect(() => { loadData() }, [])

    const applyPrefix = (name, gender) => {
        const titles = ['Mr.', 'Mrs.', 'Ms.', 'Master.', 'Miss.', 'Dr.']
        let base = (name || '').trim()
        for (const t of titles) {
            if (base.toLowerCase().startsWith(t.toLowerCase() + ' ')) { base = base.substring(t.length + 1).trim(); break }
            if (base.toLowerCase() === t.toLowerCase()) { base = ''; break }
        }
        return (gender === 'Male' ? 'Mr. ' : gender === 'Female' ? 'Mrs. ' : '') + base
    }

    const isNumericTerm = /^\d+$/.test(searchTerm);
    const filtered = patients.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (isNumericTerm ? String(p.mrn).trim() === searchTerm.trim() : String(p.mrn).includes(searchTerm))
    )

    // ── Register ──
    const handleRegister = async (e) => {
        e.preventDefault()
        if (!regData.mrn || !regData.patientName) { alert('MRN and Name are required.'); return }
        if (allPatients.some(p => p.mrn.toString() === regData.mrn.toString())) {
            alert(`MRN "${regData.mrn}" already exists.`); return
        }
        setIsSyncing(true)
        try {
            await databaseService.savePatient({
                ...regData,
                registration_date: regData.date || new Date().toLocaleDateString('en-CA')
            })
            // Create a prescription stub for the chosen date
            await databaseService.savePrescription({
                mrn: regData.mrn,
                patientName: regData.patientName,
                date: regData.date || new Date().toLocaleDateString('en-CA')
            })
            setRegOpen(false)
            // Live automation pulse
            new BroadcastChannel('nexusrx_sync').postMessage('refresh');
            await loadData()
        } catch (err) { alert('Failed: ' + err.message) }
        finally { setIsSyncing(false) }
    }

    // ── Edit ──
    const handleEdit = async (e) => {
        e.preventDefault()
        if (!editData.mrn || !editData.patientName) { alert('MRN and Name are required.'); return }
        setIsSyncing(true)
        try {
            await databaseService.savePatient({
                ...editData,
                registration_date: editData.registration_date || editData.date
            })
            setEditOpen(false)
            // Live automation pulse
            new BroadcastChannel('nexusrx_sync').postMessage('refresh');
            await loadData()
        } catch (err) { alert('Failed: ' + err.message) }
        finally { setIsSyncing(false) }
    }

    // ── Remove Visit ──
    const handleRemoveVisit = async (rxId) => {
        setIsSyncing(true);
        setPendingRemoveMrn(null);
        try {
            await databaseService.deletePrescription(rxId);
            // Live automation pulse
            new BroadcastChannel('nexusrx_sync').postMessage('refresh');
            await loadData();
        } catch (err) { alert('Failed: ' + err.message) }
        finally { setIsSyncing(false) }
    };

    const handleDeleteModalRx = async (rxId) => {
        if (!window.confirm("Are you sure you want to delete this prescription? This will only delete the prescription visit record and fees, leaving the registered patient details unchanged.")) return;
        setIsSyncing(true);
        try {
            await databaseService.deletePrescription(rxId);
            new BroadcastChannel('nexusrx_sync').postMessage('refresh');
            await loadData();
            // Re-fetch remaining
            const dbRx = await databaseService.getPrescriptions();
            const today = new Date().toLocaleDateString('en-CA');
            const remaining = (dbRx || []).filter(rx => rx.date === today && rx.mrn === modalPatient.mrn);
            if (remaining.length === 0) {
                setModalPatient(null);
            } else {
                setSelectedRxIndex(0);
            }
        } catch (err) {
            alert('Failed to delete prescription: ' + err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // ── Print OP List ──
    const handlePrint = () => {
        const rows = filtered.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="background:#fef3c7;font-weight:700;color:#92400e">OP-${String(i + 1).padStart(2, '0')}</td>
        <td style="font-weight:700;color:#1d4ed8">${p.mrn}</td>
        <td>${p.name || p.patient_name || ''}</td>
        <td><strong>${p.doctor_name || '—'}</strong></td>
        <td>${p.age || ''}</td>
        <td>${p.sex || ''}</td>
        <td>${p.phone || ''}</td>
        <td>${p.last_weight || ''}</td>
        <td>${p.last_bp || ''}</td>
        <td>${p.last_pulse || ''}</td>
        <td>${p.last_temp || ''}</td>
      </tr>`).join('')

        const win = window.open('', '_blank', 'width=1000,height=700')
        win.document.write(`<!DOCTYPE html><html><head><title>Today OP - ${todayFull}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20px;font-size:13px}
      h2{margin-bottom:4px} p{color:#666;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#1e40af;color:white;font-size:12px}
      tr:nth-child(even){background:#f8fafc}
      @media print{button{display:none}}
    </style></head><body>
    <button onclick="window.print()" style="margin-bottom:12px;padding:8px 20px;background:#1e40af;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨 Print</button>
    <h2>🩺 Today's OP List</h2>
    <p>${todayFull} &nbsp;|&nbsp; ${filtered.length} Patients</p>
    <table><thead><tr><th>#</th><th>Token</th><th>MRN</th><th>Patient Name</th><th>Doctor</th><th>Age</th><th>Sex</th><th>Phone</th><th>Weight</th><th>BP</th><th>Pulse</th><th>Temp</th></tr></thead>
    <tbody>${rows}</tbody></table>
    </body></html>`)
        win.document.close()
    }

    // Prescription modal data
    const getRxPreview = () => {
        if (!modalPatient) return null
        const patientRxs = prescriptions.filter(rx => rx.mrn === modalPatient.mrn)
        const activeRx = patientRxs[selectedRxIndex]
        if (!activeRx) return { patientRxs, previewData: null }
        const docInfo = users.find(u => u.name === activeRx.doctor_name) || {}
        let vitals = {}, meds = []
        try { vitals = JSON.parse(activeRx.vitals || '{}') } catch { }
        try { meds = JSON.parse(activeRx.medicines || '[]') } catch { }
        return {
            patientRxs,
            previewData: {
                mrn: activeRx.mrn || modalPatient.mrn,
                date: activeRx.date,
                patientName: activeRx.patient_name || modalPatient.name,
                age: modalPatient.age, gender: modalPatient.sex, phone: modalPatient.phone,
                weight: vitals.weight, bp: vitals.bp, pulse: vitals.pulse, temp: vitals.temp,
                complaints: activeRx.complaints, diagnosis: activeRx.diagnosis,
                medicines: meds, advice: activeRx.advice, followUp: activeRx.follow_up,
                doctorName: activeRx.doctor_name, doctorQualifications: docInfo.qualification,
                doctorRole: docInfo.consultant, doctorRegNo: activeRx.doctor_reg_no,
            }
        }
    }

    const rxModal = modalPatient ? getRxPreview() : null

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <header style={{ background: '#1e3a5f', color: 'white', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.4rem' }}>🩺</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: 0.3 }}>Today's OP List</div>
                        <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>{todayFull}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isSyncing && <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>⏳ Loading...</span>}
                    <button onClick={handlePrint} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>🖨 Print List</button>
                    <button onClick={() => navigate('/admin?tab=patients')} style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>🏥 Patient Records</button>
                    <button onClick={() => navigate('/admin')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>← Admin</button>
                </div>
            </header>

            {/* Subbar */}
            <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, borderRadius: 999, padding: '3px 12px', fontSize: '0.85rem' }}>{filtered.length} Patients Today</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <input
                        placeholder="Search by name or MRN..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', width: 220, outline: 'none' }}
                    />
                    <button
                        onClick={() => navigate('/admin?tab=patients')}
                        style={{ background: '#7c3aed', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >🏥 Patient Records</button>
                    <button
                        onClick={() => { setRegData({ ...EMPTY_PATIENT, mrn: getNextMRN(allPatients) }); setRegOpen(true) }}
                        style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
                    >➕ Register Patient</button>
                </div>
            </div>

            {/* Table */}
            <div style={{ padding: '16px 24px', overflowX: 'auto' }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🩺</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 600 }}>No patients registered today</div>
                        <div style={{ fontSize: '0.85rem', marginTop: 6 }}>{todayFull}</div>
                        <button onClick={() => { setRegData({ ...EMPTY_PATIENT, mrn: getNextMRN(allPatients) }); setRegOpen(true) }}
                            style={{ marginTop: 20, background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                            ➕ Register Today's First Patient
                        </button>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', fontSize: '0.83rem' }}>
                        <thead>
                            <tr style={{ background: '#1e3a5f', color: 'white' }}>
                                {['#', 'Token', 'MRN', 'Patient Name', 'Doctor', 'Print Status', 'Age', 'Sex', 'Phone', 'Visits', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 10px', fontWeight: 700, textAlign: h === 'Actions' || h === 'Visits' ? 'center' : 'left', whiteSpace: 'nowrap', fontSize: '0.74rem', letterSpacing: 0.3, color: 'white' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p, idx) => {
                                const rxCount = prescriptions.filter(rx => {
                                    if (String(rx.mrn).trim() !== String(p.mrn).trim()) return false;
                                    if (new Date(rx.date).toLocaleDateString('en-IN') !== todayStr) return false;
                                    let meds = [];
                                    try { meds = JSON.parse(rx.medicines || '[]'); } catch (e) { }
                                    return (Array.isArray(meds) && meds.length > 0) ||
                                        !!(rx.diagnosis && rx.diagnosis.trim()) ||
                                        !!(rx.complaints && rx.complaints.trim()) ||
                                        !!(rx.advice && rx.advice.trim());
                                }).length
                                return (
                                    <tr key={p.rxId || p.mrn} data-rx-id={p.rxId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '8px 10px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <span style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 5, padding: '2px 8px', fontWeight: 700, fontSize: '0.75rem', color: '#92400e' }}>
                                                OP-{String(idx + 1).padStart(2, '0')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>{p.mrn}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>{p.name || p.patient_name}</td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <span style={{ background: '#f0fdf4', color: '#166534', borderRadius: 4, padding: '2px 8px', fontWeight: 700, fontSize: '0.72rem', border: '1px solid #bbf7d0' }}>
                                                {p.doctor_name || 'Not Assigned'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <span style={{
                                                background: p.status === 'success' ? '#f0fdf4' : '#fffbeb',
                                                color: p.status === 'success' ? '#166534' : '#b45309',
                                                borderRadius: 4,
                                                padding: '2px 8px',
                                                fontWeight: 700,
                                                fontSize: '0.72rem',
                                                border: `1px solid ${p.status === 'success' ? '#bbf7d0' : '#fde68a'}`,
                                                textTransform: 'capitalize'
                                            }}>
                                                {p.status || 'pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>{p.age || '—'}</td>
                                        <td style={{ padding: '8px 10px' }}>{p.sex || '—'}</td>
                                        <td style={{ padding: '8px 10px' }}>{p.phone || '—'}</td>
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                            {(() => {
                                                const historyRxs = prescriptions.filter(rx => {
                                                    if (String(rx.mrn).trim() !== String(p.mrn).trim()) return false;
                                                    let meds = [];
                                                    try { meds = JSON.parse(rx.medicines || '[]'); } catch (e) { }
                                                    return (Array.isArray(meds) && meds.length > 0) ||
                                                        !!(rx.diagnosis && rx.diagnosis.trim()) ||
                                                        !!(rx.complaints && rx.complaints.trim()) ||
                                                        !!(rx.advice && rx.advice.trim());
                                                });
                                                const visitDates = new Set(historyRxs.map(rx => rx.date).filter(Boolean));

                                                // Automatic increment: If they are in the list for today, they have at least one visit (today)
                                                // We add the today's date to the set to ensure it's counted
                                                visitDates.add(new Date(p.updated_at).toLocaleDateString('en-CA'));

                                                const count = visitDates.size;
                                                return (
                                                    <span style={{
                                                        background: count > 1 ? '#eff6ff' : '#f0fdf4',
                                                        color: count > 1 ? '#1d4ed8' : '#166534',
                                                        border: `1px solid ${count > 1 ? '#93c5fd' : '#bbf7d0'}`,
                                                        borderRadius: 5, padding: '2px 8px', fontWeight: 800, fontSize: '0.72rem'
                                                    }}>
                                                        {count} {count > 1 ? 'Visits' : 'Visit'}
                                                    </span>
                                                )
                                            })()}
                                        </td>
                                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                                                {rxCount > 0 && (
                                                    <button onClick={() => { setModalPatient(p); setSelectedRxIndex(0) }}
                                                        title="View Prescriptions"
                                                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                                                        📋 {rxCount}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setEditData({
                                                            mrn: p.mrn,
                                                            patientName: p.name,
                                                            age: p.age,
                                                            gender: p.sex,
                                                            phone: p.phone,
                                                            weight: p.last_weight,
                                                            bp: p.last_bp,
                                                            pulse: p.last_pulse,
                                                            temp: p.last_temp,
                                                            registration_date: p.registration_date || p.date
                                                        })
                                                        setEditOpen(true)
                                                    }}
                                                    title="Edit Patient"
                                                    style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>
                                                    ✏️ Edit
                                                </button>
                                                {(() => {
                                                    const deleteId = p.rxId || p.id;
                                                    if (!deleteId) return null;
                                                    return pendingRemoveMrn === deleteId ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>Sure?</span>
                                                            <button onClick={() => handleRemoveVisit(deleteId)}
                                                                style={{ background: '#ef4444', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', color: 'white', fontWeight: 700 }}>
                                                                Yes
                                                            </button>
                                                            <button onClick={() => setPendingRemoveMrn(null)}
                                                                style={{ background: '#e2e8f0', border: 'none', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#475569', fontWeight: 700 }}>
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => setPendingRemoveMrn(deleteId)}
                                                            title="Remove Visit"
                                                            style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem', color: '#ef4444', fontWeight: 700 }}>
                                                            🗑️
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Register Modal ── */}
            {regOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        <div style={{ background: '#10b981', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>➕ Register Today's Patient</span>
                            <button onClick={() => setRegOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                        <form onSubmit={handleRegister} style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[['Registration Date', 'date'], ['MRN *', 'mrn'], ['Patient Name *', 'patientName'], ['Age', 'age'], ['Phone', 'phone'], ['Weight', 'weight'], ['BP', 'bp'], ['Pulse', 'pulse'], ['Temp', 'temp']].map(([label, key]) => (
                                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>{label}</label>
                                    <input
                                        type={key === 'date' ? 'date' : 'text'}
                                        value={regData[key] || ''}
                                        onChange={e => {
                                            const val = e.target.value
                                            if (key === 'patientName') { setRegData(p => ({ ...p, patientName: applyPrefix(val, p.gender) })) }
                                            else { setRegData(p => ({ ...p, [key]: val })) }
                                        }}
                                        style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', outline: 'none' }}
                                    />
                                </div>
                            ))}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Gender</label>
                                <select value={regData.gender} onChange={e => { const g = e.target.value; setRegData(p => ({ ...p, gender: g, patientName: applyPrefix(p.patientName, g) })) }}
                                    style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', outline: 'none' }}>
                                    <option value="">Select</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" onClick={() => setRegOpen(false)} style={{ padding: '8px 18px', border: '1px solid #cbd5e1', borderRadius: 7, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Cancel</button>
                                <button type="submit" disabled={isSyncing} style={{ padding: '8px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {isSyncing ? 'Saving...' : 'Register'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ── */}
            {editOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                        <div style={{ background: '#d97706', color: 'white', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '1rem' }}>✏️ Edit Patient — MRN {editData.mrn}</span>
                            <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                        <form onSubmit={handleEdit} style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[['Patient Name *', 'patientName'], ['Registration Date', 'registration_date'], ['Age', 'age'], ['Phone', 'phone'], ['Weight (kg)', 'weight'], ['BP', 'bp'], ['Pulse', 'pulse'], ['Temp (°F)', 'temp']].map(([label, key]) => (
                                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>{label}</label>
                                    <input
                                        type={key === 'registration_date' ? 'date' : 'text'}
                                        value={editData[key] || ''}
                                        onChange={e => {
                                            const val = e.target.value
                                            if (key === 'patientName') { setEditData(p => ({ ...p, patientName: applyPrefix(val, p.gender) })) }
                                            else { setEditData(p => ({ ...p, [key]: val })) }
                                        }}
                                        style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', outline: 'none' }}
                                    />
                                </div>
                            ))}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Gender</label>
                                <select value={editData.gender} onChange={e => { const g = e.target.value; setEditData(p => ({ ...p, gender: g, patientName: applyPrefix(p.patientName, g) })) }}
                                    style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', outline: 'none' }}>
                                    <option value="">Select</option>
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                            </div>
                            <div style={{ gridColumn: '1/-1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                                <button type="button" onClick={() => setEditOpen(false)} style={{ padding: '8px 18px', border: '1px solid #cbd5e1', borderRadius: 7, background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Cancel</button>
                                <button type="submit" disabled={isSyncing} style={{ padding: '8px 20px', background: '#d97706', color: 'white', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {isSyncing ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Prescription Viewer Modal ── */}
            {modalPatient && rxModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', width: '100%', maxWidth: 1100, margin: 'auto', background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxHeight: '95vh' }}>
                        {/* Left: list */}
                        <div style={{ width: 220, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Prescriptions</div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rxModal.patientRxs.length} Records</div>
                                </div>
                                <button onClick={() => setModalPatient(null)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {rxModal.patientRxs.length === 0 && <div style={{ padding: 20, color: '#94a3b8', fontSize: '0.82rem' }}>No prescriptions found.</div>}
                                {rxModal.patientRxs.map((rx, idx) => (
                                    <div key={idx} onClick={() => setSelectedRxIndex(idx)}
                                        style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', background: selectedRxIndex === idx ? '#dbeafe' : 'transparent', borderLeft: selectedRxIndex === idx ? '3px solid #2563eb' : '3px solid transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>📅 {rx.date}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Dr. {rx.doctor_name}</div>
                                            {rx.diagnosis && <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{rx.diagnosis}</div>}
                                        </div>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await handleDeleteModalRx(rx.id);
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px 8px', fontSize: '0.95rem' }}
                                            title="Delete prescription record only"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setModalPatient(null)} style={{ margin: 12, padding: '8px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>Close Viewer</button>
                        </div>
                        {/* Right: preview */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#e8edf2', display: 'flex', flexDirection: 'column' }}>
                            {rxModal.previewData ? (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px 20px', borderRadius: 8, marginBottom: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div>
                                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>Viewing Prescription</span>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 10 }}>Patient MRN ID: {rxModal.previewData.mrn}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={async () => {
                                                    const paperEl = document.getElementById('prescription-paper');
                                                    if (!paperEl) { alert('Preview element not found.'); return; }
                                                    const printWindow = window.open('', '_blank', 'width=1000,height=900');
                                                    if (!printWindow) { alert('Popup blocked! Please allow popups for this site.'); return; }
                                                    const extraStyles = Array.from(paperEl.parentElement.querySelectorAll('style')).map(s => s.innerHTML).join('\n');
                                                    printWindow.document.write(`
                                                      <!DOCTYPE html>
                                                      <html>
                                                        <head>
                                                          <meta charset="utf-8" />
                                                          <title>Prescription - ${rxModal.previewData.patientName}</title>
                                                          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700;900&family=Inter:wght@400;600;700&display=swap" />
                                                          <style>
                                                            * { box-sizing: border-box; margin: 0; padding: 0; }
                                                            body { background: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; }
                                                            #paper-wrapper { padding: 0; display: flex; justify-content: center; width: 100%; }
                                                            #prescription-paper { width: 210mm; min-height: 297mm; background: white; box-shadow: none; border: none; border-radius: 0; }
                                                            ${extraStyles}
                                                          </style>
                                                        </head>
                                                        <body>
                                                          <div id="paper-wrapper">${paperEl.outerHTML}</div>
                                                          <script>
                                                            window.focus();
                                                            window.onload = function() { window.print(); window.close(); }
                                                          </script>
                                                        </body>
                                                      </html>
                                                    `);
                                                    printWindow.document.close();
                                                }}
                                                style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                            >
                                                🖨️ Print
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const paperEl = document.getElementById('prescription-paper');
                                                    if (!paperEl) { alert('Preview element not found.'); return; }
                                                    if (typeof window.html2pdf === 'undefined') {
                                                        alert('PDF library is not loaded yet.');
                                                        return;
                                                    }

                                                    // Create clean offscreen staging area at X/Y = 0 to prevent coordinate clipping
                                                    const container = document.createElement('div');
                                                    container.style.position = 'fixed';
                                                    container.style.left = '0';
                                                    container.style.top = '0';
                                                    container.style.width = '210mm';
                                                    container.style.background = 'white';
                                                    container.style.zIndex = '-99999';
                                                    container.style.transform = 'none';
                                                    container.style.pointerEvents = 'none';

                                                    // Clone element
                                                    const clone = paperEl.cloneNode(true);
                                                    clone.style.position = 'relative';
                                                    clone.style.left = '0';
                                                    clone.style.top = '0';
                                                    clone.style.transform = 'none';
                                                    clone.style.boxShadow = 'none';
                                                    clone.style.border = 'none';
                                                    clone.style.margin = '0';
                                                    clone.style.width = '210mm';
                                                    clone.style.minHeight = '297mm';

                                                    const inputs = paperEl.querySelectorAll('input, select, textarea');
                                                    const cloneInputs = clone.querySelectorAll('input, select, textarea');
                                                    inputs.forEach((input, index) => {
                                                        if (cloneInputs[index]) cloneInputs[index].value = input.value;
                                                    });

                                                    container.appendChild(clone);
                                                    document.body.appendChild(container);

                                                    const filename = `Prescription_${rxModal.previewData.mrn}_${rxModal.previewData.date || 'draft'}.pdf`;
                                                    const opt = {
                                                        margin: 0,
                                                        filename,
                                                        image: { type: 'jpeg', quality: 1.0 },
                                                        html2canvas: {
                                                            scale: 3,
                                                            useCORS: true,
                                                            windowWidth: 794,
                                                            scrollY: 0,
                                                            scrollX: 0,
                                                            backgroundColor: '#ffffff'
                                                        },
                                                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                                                    };

                                                    try {
                                                        const worker = window.html2pdf().set(opt).from(clone);
                                                        const pdfBlob = await worker.output('blob');
                                                        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
                                                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                                                            await navigator.share({ files: [pdfFile], title: `Prescription - ${rxModal.previewData.patientName}`, text: `Prescription for ${rxModal.previewData.patientName} (MRN: ${rxModal.previewData.mrn})` });
                                                        } else {
                                                            const url = URL.createObjectURL(pdfBlob);
                                                            const a = document.createElement('a');
                                                            a.href = url; a.download = filename; a.click();
                                                            URL.revokeObjectURL(url);
                                                        }
                                                    } catch (err) {
                                                        console.error('Share failed:', err);
                                                        if (err.name !== 'AbortError') alert('Could not share. Try the Print button instead.');
                                                    } finally {
                                                        document.body.removeChild(container);
                                                    }
                                                }}
                                                style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                            >
                                                📤 Share
                                            </button>
                                            <button
                                                onClick={() => handleDeleteModalRx(rxModal.patientRxs[selectedRxIndex].id)}
                                                style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                        <div style={{ width: '100%', maxWidth: '800px' }}>
                                            <PrescriptionPreview data={rxModal.previewData} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No prescription selected.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
