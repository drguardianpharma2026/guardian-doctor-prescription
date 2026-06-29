import React, { useEffect, useState } from 'react';
import { databaseService } from '../services/databaseService';
import PrescriptionPreview from './PrescriptionPreview';

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

const DoctorItem = ({ doc, isLast, onSelect, onDelete }) => {
  const [isConfirming, setIsConfirming] = React.useState(false);

  return (
    <div
      onClick={() => { if (!isConfirming) onSelect(doc); }}
      style={{
        padding: '0.75rem 1rem',
        cursor: 'pointer',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transition: 'background 0.2s',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: isConfirming ? '#fff1f1' : 'white'
      }}
      onMouseEnter={(e) => { if (!isConfirming) e.currentTarget.style.background = '#f0f4ff'; }}
      onMouseLeave={(e) => { if (!isConfirming) e.currentTarget.style.background = 'white'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', margin: 0 }}>{doc.qualifications}</p>
      </div>

      {isConfirming ? (
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
            style={{ padding: '3px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
          >Delete</button>
          <button
            onClick={(e) => { e.stopPropagation(); setIsConfirming(false); }}
            style={{ padding: '3px 8px', background: '#ccc', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
          >Cancel</button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setIsConfirming(true); }}
          style={{ background: 'transparent', border: 'none', padding: '4px', color: '#ef4444', cursor: 'pointer', display: 'flex', borderRadius: '4px', flexShrink: 0 }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
};

/* ── Section Header ── */
const SectionHeader = ({ icon, title }) => (
  <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '1rem', color: 'var(--primary)' }}>
    {icon}
    {title}
  </h2>
);

/* ── Field Label ── */
const Label = ({ children }) => (
  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.25rem' }}>
    {children}
  </label>
);

const PrescriptionForm = ({ data, setData, savedDoctors, adminMedicines = [], onDoctorSelect, onSaveDoctor, onDeleteDoctor, onSave, sessionDoctor }) => {
  const isDoctorLocked = !!sessionDoctor;

  const [showDoctorDropdown, setShowDoctorDropdown] = React.useState(false);
  const [patientHistory, setPatientHistory] = React.useState([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = React.useState(0);
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false);
  const [isModalZoomed, setIsModalZoomed] = React.useState(false);

  const updateField = (field, value) => {
    let newData = { ...data, [field]: value };

    // Auto-prefix Patient Name based on Gender
    if (field === 'gender' && value) {
      let name = data.patientName.trim();
      const titles = ['Mr.', 'Mrs.', 'Ms.', 'Master.', 'Miss.', 'Dr.'];

      // Find if existing name has a title and extract the base name
      let baseName = name;
      for (const t of titles) {
        if (name.toLowerCase().startsWith(t.toLowerCase() + ' ')) {
          baseName = name.substring(t.length + 1).trim();
          break;
        } else if (name.toLowerCase() === t.toLowerCase()) {
          // Case where only the title was typed
          baseName = '';
          break;
        }
      }

      let newPrefix = '';
      if (value === 'Male' || value === 'Y/M') {
        newPrefix = 'Mr. ';
      } else if (value === 'Female' || value === 'Y/F') {
        newPrefix = 'Mrs. ';
      }

      if (newPrefix) {
        newData.patientName = newPrefix + baseName;
      }
    }

    setData(newData);
  };

  const setFollowUpInDays = (days) => {
    // Use the form's date as the base, or today if not set
    const baseDate = data.date ? new Date(data.date) : new Date();
    const futureDate = new Date(baseDate);
    futureDate.setDate(baseDate.getDate() + days);

    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    const formatted = `${year}-${month}-${day}`;

    updateField('followUp', formatted);
  };

  const getAutoFollowUpDays = () => {
    let maxDays = 0;
    data.medicines.forEach(med => {
      const duration = med.duration;
      if (!duration) return;
      const numMatch = duration.match(/(\d+)/);
      if (numMatch) {
        let days = parseInt(numMatch[1]);
        if (duration.includes('வாரம்') || duration.toLowerCase().includes('week')) days *= 7;
        if (duration.includes('மாதம்') || duration.toLowerCase().includes('month')) days *= 30;
        if (days > maxDays) maxDays = days;
      }
    });
    return maxDays;
  };

  const calculateQty = (dosage, duration) => {
    if (!dosage || !duration) return '';

    // Parse dosage (e.g., "1-0-1", "BD 1-0-1", "TDS")
    let perDay = 0;
    const dosageMatch = dosage.match(/(\d+)-(\d+)-(\d+)(?:-(\d+))?/);
    if (dosageMatch) {
      perDay = (parseInt(dosageMatch[1]) || 0) + (parseInt(dosageMatch[2]) || 0) + (parseInt(dosageMatch[3]) || 0) + (parseInt(dosageMatch[4]) || 0);
    } else if (dosage.includes('TDS')) perDay = 3;
    else if (dosage.includes('BD')) perDay = 2;
    else if (dosage.includes('OD')) perDay = 1;
    else if (dosage.includes('QID')) perDay = 4;

    // Parse duration (e.g., "30 நாட்கள்", "15 days", "1 வாரம்")
    let days = 0;
    const numMatch = duration.match(/(\d+)/);
    if (numMatch) {
      days = parseInt(numMatch[1]);
      if (duration.includes('வாரம்') || duration.toLowerCase().includes('week')) days *= 7;
      if (duration.includes('மாதம்') || duration.toLowerCase().includes('month')) days *= 30;
    }

    return perDay * days || '';
  };

  const updateMedicine = (index, field, value) => {
    setData(prevData => {
      const newMedicines = [...prevData.medicines];
      const updatedMed = { ...newMedicines[index], [field]: value };

      // Auto-calculate Qty if dosage or duration changed
      if (field === 'dosage' || field === 'duration') {
        const calculated = calculateQty(updatedMed.dosage, updatedMed.duration);
        if (calculated) {
          updatedMed.qty = calculated.toString();
        }
      }

      newMedicines[index] = updatedMed;
      return { ...prevData, medicines: newMedicines };
    });
  };

  const addMedicine = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setData({
      ...data,
      medicines: [...data.medicines, { id: newId, type: '', name: '', composition: '', dosage: '', timing: '', schedule: '', duration: '', qty: '', showDosageTips: false, showTimingTips: false, showDurationTips: false, showScheduleTips: false, suggestionIndex: -1 }]
    });
    // Focus the new medicine name input after render
    setTimeout(() => {
      const inputs = document.querySelectorAll('input[placeholder="Medicine Name"]');
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    }, 50);
  };

  const moveMedicine = (index, direction) => {
    const newMedicines = [...data.medicines];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newMedicines.length) return;
    [newMedicines[index], newMedicines[newIndex]] = [newMedicines[newIndex], newMedicines[index]];
    setData({ ...data, medicines: newMedicines });
  };

  const removeMedicine = (index) => {
    const newMedicines = data.medicines.filter((_, i) => i !== index);
    setData({ ...data, medicines: newMedicines });
  };

  const handleSaveCurrent = () => {
    if (!data.doctorName.trim()) { alert('Please enter a doctor name first.'); return; }
    onSaveDoctor({ name: data.doctorName, qualifications: data.doctorQualifications, role: data.doctorRole, regNo: data.doctorRegNo });
    alert('Doctor details saved!');
  };

  const handleClearPatient = async () => {
    if (confirm('Clear all patient and clinical data?')) {
      let nextMRN = '';
      try {
        const allPatients = await databaseService.getAllPatients();
        nextMRN = getNextAutomationMRN(allPatients || []);
      } catch (e) {
        console.error('Failed to get next MRN:', e);
      }

      setPatientHistory([]);
      setActiveHistoryIndex(0);
      setData({
        ...data,
        mrn: nextMRN, visitNo: '', patientName: '', age: '', gender: '', phone: '',
        date: data.date, // Preserve specifically chosen date
        complaints: '', diagnosis: '',
        medicines: [{ id: Math.random().toString(36).substr(2, 9), type: '', name: '', composition: '', dosage: '', timing: '', schedule: '', duration: '', qty: '', showDosageTips: false, showTimingTips: false, showDurationTips: false, showScheduleTips: false }],
        advice: '', followUp: '',
        weight: '', bp: '', pulse: '', temp: ''
      });
    }
  };

  const handleMRNBlur = async () => {
    if (!data.mrn.trim()) return;

    const patient = await databaseService.getPatient(data.mrn);
    if (patient) {
      setData(prev => ({
        ...prev,
        patientName: patient.name || prev.patientName,
        age: patient.age || prev.age,
        gender: patient.sex || prev.gender,
        phone: patient.phone || prev.phone,
        weight: patient.last_weight || prev.weight,
        bp: patient.last_bp || prev.bp,
        pulse: patient.last_pulse || prev.pulse,
        temp: patient.last_temp || prev.temp
      }));
    }
  };




  const divider = <div style={{ height: '1px', background: 'var(--border)', margin: '1.5rem 0' }} />;

  const timingOptions = [
    'Before Food / உணவுக்கு முன்',
    'After Food / உணவுக்கு பின்',
    'Empty Stomach / வெறும் வயிற்றில்',
    'Bedtime / படுக்கைக்கு முன்',
    'As Needed / தேவைப்படும் போது'
  ];

  const durationOptions = [
    '3 நாட்கள்',
    '5 நாட்கள்',
    '1 வாரம்',
    '10 நாட்கள்',
    '15 நாட்கள்',
    '1 மாதம்'
  ];

  const scheduleOptions = [
    'தினசரி',
    'மாற்று நாட்கள்',
    'வாரம் ஒரு முறை',
    '3 நாட்களுக்கு ஒருமுறை'
  ];

  const quickDosages = [
    'OD 1-0-0',
    'OD 0-1-0',
    'OD 0-0-1',
    'BD 1-0-1',
    'TDS 1-1-1',
    'TDS 2-2-2'
  ];

  // Global Key Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (onSave) onSave();
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        document.querySelector('button[onClick*="preview"]')?.click() || alert('Switch to Preview tab to print');
      }
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        addMedicine();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [data]);

  // Live auto-populate patient details on MRN change
  useEffect(() => {
    const trimmed = data.mrn?.trim();
    if (!trimmed) {
      setPatientHistory([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const patient = await databaseService.getPatient(trimmed);
        if (patient) {
          setData(prev => {
            // Only update if the MRN matches the current input
            if (prev.mrn?.trim() !== trimmed) return prev;
            return {
              ...prev,
              patientName: patient.name || prev.patientName,
              age: patient.age || prev.age,
              gender: patient.sex || prev.gender,
              phone: patient.phone || prev.phone,
              weight: patient.last_weight || prev.weight,
              bp: patient.last_bp || prev.bp,
              pulse: patient.last_pulse || prev.pulse,
              temp: patient.last_temp || prev.temp
            };
          });
        }

        // Fetch ALL history for this patient
        const rxList = await databaseService.getPrescriptionsByMRN(trimmed);
        if (rxList && rxList.length > 0) {
          const history = rxList.map(rx => {
            let meds = [];
            try { meds = JSON.parse(rx.medicines || '[]'); } catch (e) { }
            return {
              date: rx.date || '',
              diagnosis: rx.diagnosis || '',
              complaints: rx.complaints || '',
              doctorName: rx.doctor_name || '',
              medicines: meds,
              advice: rx.advice || '',
              followUp: rx.follow_up || ''
            };
          });
          setPatientHistory(history);
          setActiveHistoryIndex(0);

          // Update Visit Number automatically
          setData(prev => ({
            ...prev,
            visitNo: (history.length + 1).toString()
          }));
        } else {
          setPatientHistory([]);
          setData(prev => ({ ...prev, visitNo: '1' }));
        }
      } catch (err) {
        console.error('Error fetching patient live:', err);
      }
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [data.mrn]);

  const handleMedKeyDown = (e, index, med) => {
    const typeMap = {
      'Tablet': 'TAB', 'Capsule': 'CAP', 'Syrup': 'SYP', 'Injection': 'INJ',
      'Drops': 'DRP', 'Ointment': 'GEL', 'Cream': 'CRM', 'Lotion': 'LOTION', 'Spray': 'SPRAY'
    };
    const filtered = adminMedicines.filter(am => {
      const nameMatch = am.name.toLowerCase().includes(med.name.toLowerCase()) ||
        (am.composition && am.composition.toLowerCase().includes(med.name.toLowerCase()));
      if (!nameMatch) return false;
      if (!med.type) return true;
      const mappedAmType = typeMap[am.type] || am.type;
      return mappedAmType?.toUpperCase() === med.type?.toUpperCase();
    });

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = e.key === 'ArrowDown'
        ? Math.min((med.suggestionIndex || -1) + 1, filtered.length - 1)
        : Math.max((med.suggestionIndex || -1) - 1, 0);

      updateMedicine(index, 'suggestionIndex', nextIndex);

      // Auto-scroll logic
      setTimeout(() => {
        const activeItem = document.getElementById(`suggestion-${index}-${nextIndex}`);
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 10);
    } else if (e.key === 'Enter') {
      if (med.suggestionIndex >= 0 && filtered[med.suggestionIndex]) {
        e.preventDefault();
        const selected = filtered[med.suggestionIndex];
        selectMedicine(index, selected);
      } else if (med.name.trim()) {
        // Move to next field
        const row = e.target.closest('.medicine-card');
        const inputs = Array.from(row.querySelectorAll('input, select, textarea'));
        const nextIdx = inputs.indexOf(e.target) + 1;
        if (nextIdx < inputs.length) {
          inputs[nextIdx].focus();
        } else if (index === data.medicines.length - 1) {
          addMedicine();
        }
      }
    } else if (e.key === 'Escape') {
      updateMedicine(index, 'showSuggestions', false);
    }
  };

  const selectMedicine = (index, am) => {
    const typeMap = {
      'Tablet': 'TAB', 'Capsule': 'CAP', 'Syrup': 'SYP', 'Injection': 'INJ',
      'Drops': 'DRP', 'Ointment': 'GEL', 'Cream': 'CRM', 'Lotion': 'LOTION', 'Spray': 'SPRAY'
    };

    setData(prev => {
      const newMeds = [...prev.medicines];
      const rawType = am.type || '';
      const mappedType = typeMap[rawType] || rawType;

      newMeds[index] = {
        ...newMeds[index],
        name: am.name,
        type: mappedType || newMeds[index].type,
        composition: am.composition || newMeds[index].composition,
        showSuggestions: false,
        suggestionIndex: -1
      };
      return { ...prev, medicines: newMeds };
    });
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>

      {/* ══ DOCTOR SETUP ══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <SectionHeader
          title="Doctor Setup"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
        />
        {isDoctorLocked ? (
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, color: '#0d9488',
            background: '#f0fdfa', border: '1px solid #99f6e4',
            borderRadius: '20px', padding: '3px 10px',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>🔒 Session Locked</span>
        ) : (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
              style={{
                background: 'white', border: '1px solid var(--border)', padding: '0.45rem 0.875rem',
                borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, display: 'flex',
                alignItems: 'center', gap: '0.4rem', cursor: 'pointer', color: 'var(--text)'
              }}
            >
              Saved
              <svg style={{ transform: showDoctorDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {showDoctorDropdown && (
              <>
                <div onClick={() => setShowDoctorDropdown(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '0.4rem',
                  width: '260px', background: 'white', border: '1px solid var(--border)',
                  borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.12)', zIndex: 101, overflow: 'hidden'
                }}>
                  {savedDoctors.length === 0
                    ? <p style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--secondary)', textAlign: 'center' }}>No saved doctors</p>
                    : savedDoctors.map((doc, idx) => (
                      <DoctorItem key={idx} doc={doc} isLast={idx === savedDoctors.length - 1}
                        onSelect={(d) => { onDoctorSelect(d); setShowDoctorDropdown(false); }}
                        onDelete={onDeleteDoctor}
                      />
                    ))
                  }
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="form-grid-2col" style={isDoctorLocked ? { background: '#f0fdfa', borderRadius: '10px', padding: '0.75rem', border: '1px solid #99f6e4' } : {}}>
        <div>
          <Label>Doctor Name</Label>
          <input
            type="text"
            value={data.doctorName}
            onChange={(e) => !isDoctorLocked && updateField('doctorName', e.target.value)}
            readOnly={isDoctorLocked}
            onBlur={(e) => {
              if (isDoctorLocked) return;
              let val = e.target.value.trim();
              if (val && !val.toUpperCase().startsWith('DR.')) {
                if (val.toUpperCase().startsWith('DR ')) {
                  val = 'DR. ' + val.substring(3);
                } else {
                  val = 'DR. ' + val;
                }
              }
              updateField('doctorName', val.toUpperCase());
            }}
            placeholder="Dr. Name"
            style={isDoctorLocked ? { background: '#f0fdfa', cursor: 'default', fontWeight: 700 } : {}}
          />
        </div>
        <div>
          <Label>Qualifications</Label>
          <input
            type="text"
            value={data.doctorQualifications}
            onChange={(e) => !isDoctorLocked && updateField('doctorQualifications', e.target.value)}
            readOnly={isDoctorLocked}
            placeholder="BDS., MDS."
            style={isDoctorLocked ? { background: '#f0fdfa', cursor: 'default' } : {}}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Specialization / Role</Label>
          <input
            type="text"
            value={data.doctorRole}
            onChange={(e) => !isDoctorLocked && updateField('doctorRole', e.target.value)}
            readOnly={isDoctorLocked}
            placeholder="Role description"
            style={isDoctorLocked ? { background: '#f0fdfa', cursor: 'default' } : {}}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Registration Number (Reg No)</Label>
          <input
            type="text"
            value={data.doctorRegNo || ''}
            onChange={(e) => !isDoctorLocked && updateField('doctorRegNo', e.target.value)}
            readOnly={isDoctorLocked}
            onBlur={(e) => {
              if (isDoctorLocked) return;
              let val = e.target.value.trim();
              if (val && /^\d+$/.test(val)) {
                updateField('doctorRegNo', `Reg No - ${val}`);
              }
            }}
            placeholder="Reg No - 93179"
            style={isDoctorLocked ? { background: '#f0fdfa', cursor: 'default' } : {}}
          />
        </div>
      </div>

      {!isDoctorLocked && (
        <button
          onClick={handleSaveCurrent}
          style={{
            width: '100%', padding: '0.6rem', background: 'var(--primary-subtle)',
            color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '8px',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem'
          }}
        >
          💾 Save Doctor to List
        </button>
      )}

      {divider}

      {/* ══ PATIENT INFO ══ */}
      <SectionHeader
        title="Patient Info"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
      />

      <div className="form-grid-2col" style={{ marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <Label style={{ margin: 0 }}>MRN (Patient ID)</Label>
            <button
              type="button"
              onClick={async () => {
                try {
                  const allPatients = await databaseService.getAllPatients();
                  const nextMRN = getNextAutomationMRN(allPatients || []);
                  updateField('mrn', nextMRN);
                } catch (err) {
                  updateField('mrn', '123456789');
                }
              }}
              style={{ background: '#e0f2fe', border: 'none', borderRadius: 4, color: '#0369a1', fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', cursor: 'pointer' }}
            >
              🤖 Auto-generate (123456789)
            </button>
          </div>
          <input
            type="text"
            value={data.mrn}
            onChange={async (e) => {
              const val = e.target.value;
              if (val.toLowerCase() === 'automation') {
                try {
                  const allPatients = await databaseService.getAllPatients();
                  const nextMRN = getNextAutomationMRN(allPatients || []);
                  updateField('mrn', nextMRN);
                } catch (err) {
                  updateField('mrn', '123456789');
                }
              } else {
                updateField('mrn', val);
              }
            }}
            onBlur={handleMRNBlur}
            onFocus={(e) => e.target.select()}
            placeholder="07042 (or type 'automation')"
          />
        </div>
        <div>
          <Label>Date</Label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => updateField('date', e.target.value)}
            style={{
              color: '#000000',
              fontWeight: 800,
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px'
            }}
          />
        </div>

      </div>

      {/* Row 2: Large Patient Name & Age */}
      <div className="form-grid-name-age">
        <div>
          <Label>Patient Name</Label>
          <input
            type="text"
            value={data.patientName}
            onChange={(e) => updateField('patientName', e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Full Name"
            style={{ fontWeight: 700, fontSize: '1rem' }}
          />
        </div>
        <div>
          <Label>Age</Label>
          <input
            type="text"
            value={data.age}
            onChange={(e) => updateField('age', e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder="Age"
          />
        </div>
      </div>

      {/* Row 3: Gender & Phone */}
      <div className="form-grid-gender-phone">
        <div>
          <Label>Gender</Label>
          <select
            value={data.gender}
            onChange={(e) => {
              const newGender = e.target.value;
              const updatedName = applyGenderPrefix(data.patientName, newGender);
              setData(prev => ({ ...prev, gender: newGender, patientName: updatedName }));
            }}
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
            <option value="Y/F">Y/F</option>
            <option value="Y/M">Y/M</option>
          </select>
        </div>
        <div>
          <Label>Phone Number</Label>
          <input type="text" value={data.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Mobile Number" />
        </div>
      </div>

      {/* Row 4: Vitals */}
      <div className="form-grid-vitals">
        <div>
          <Label>Weight (kg)</Label>
          <input type="text" value={data.weight || ''} onChange={(e) => updateField('weight', e.target.value)} placeholder="65" />
        </div>
        <div>
          <Label>BP (mmHg)</Label>
          <input type="text" value={data.bp || ''} onChange={(e) => updateField('bp', e.target.value)} placeholder="120/80" />
        </div>
        <div>
          <Label>Pulse (bpm)</Label>
          <input type="text" value={data.pulse || ''} onChange={(e) => updateField('pulse', e.target.value)} placeholder="72" />
        </div>
        <div>
          <Label>Temp (°F)</Label>
          <input type="text" value={data.temp || ''} onChange={(e) => updateField('temp', e.target.value)} placeholder="98.4" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
        <button
          onClick={handleClearPatient}
          style={{
            width: '100%', padding: '0.6rem', background: 'white',
            color: '#64748b', border: '1px solid var(--border)', borderRadius: '8px',
            fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
        >
          🗑 Reset Form
        </button>
      </div>

      {/* ══ PATIENT HISTORY ══ */}
      {patientHistory.length > 0 && (
        <div style={{
          margin: '1.5rem 0',
          padding: '1.25rem',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '5px', background: '#3b82f6' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              <span style={{ fontSize: '1.2rem' }}>🏥</span> Patient Medical History
            </h3>
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '60%' }}>
              {patientHistory.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setActiveHistoryIndex(i)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.2s',
                    background: activeHistoryIndex === i ? '#2563eb' : 'white',
                    color: activeHistoryIndex === i ? 'white' : '#64748b',
                    borderColor: activeHistoryIndex === i ? '#2563eb' : '#e2e8f0'
                  }}
                >
                  {h.date}
                </button>
              ))}
            </div>
          </div>

          {patientHistory[activeHistoryIndex] && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                background: '#f8fafc',
                padding: '1rem',
                borderRadius: '12px',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Attending Physician</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Dr. {patientHistory[activeHistoryIndex].doctorName || '—'}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Primary Diagnosis</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{patientHistory[activeHistoryIndex].diagnosis || 'No Diagnosis Recorded'}</span>
                </div>
                {patientHistory[activeHistoryIndex].complaints && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: '1 / -1' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Complaints</span>
                    <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>{patientHistory[activeHistoryIndex].complaints}</span>
                  </div>
                )}
              </div>

              {patientHistory[activeHistoryIndex].medicines && patientHistory[activeHistoryIndex].medicines.length > 0 && (
                <div style={{ marginLeft: '4px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prescribed Medications</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {patientHistory[activeHistoryIndex].medicines.map((m, i) => (
                      <div key={i} style={{
                        background: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 4px', borderRadius: '4px' }}>
                          {m.type || 'MED'}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>{m.name}</span>
                        {m.dosage && <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '4px' }}>• {m.dosage}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{
                display: 'flex',
                gap: '0.75rem',
                flexDirection: window.innerWidth < 600 ? 'column' : 'row'
              }}>
                <button
                  onClick={() => {
                    const prevMeds = (patientHistory[activeHistoryIndex].medicines || []).map(m => ({
                      ...m,
                      id: Math.random().toString(36).substr(2, 9)
                    }));
                    setData(prev => ({
                      ...prev,
                      medicines: prevMeds.length > 0 ? prevMeds : prev.medicines,
                      diagnosis: patientHistory[activeHistoryIndex].diagnosis || prev.diagnosis,
                      complaints: patientHistory[activeHistoryIndex].complaints || prev.complaints,
                      advice: patientHistory[activeHistoryIndex].advice || prev.advice
                    }));
                    alert('Previous clinical data copied successfully!');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  🔄 Repeat Previous Rx
                </button>
                <button
                  onClick={() => setIsViewModalOpen(true)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#ffffff',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  👁️ Full Detailed View
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {divider}

      {/* ══ CLINICAL DETAILS ══ */}
      <SectionHeader
        title="Clinical Details"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <Label>Chief Complaints (press Enter for new line)</Label>
          <textarea
            rows="5"
            value={data.complaints}
            onChange={(e) => updateField('complaints', e.target.value)}
            placeholder="Pain right knee&#10;Swelling"
            style={{ minHeight: '120px', fontSize: '1rem', background: '#fcfdff', borderColor: '#d1e0f3' }}
          />
        </div>
        <div>
          <Label>Provisional Diagnosis (press Enter for new line)</Label>
          <textarea
            rows="5"
            value={data.diagnosis}
            onChange={(e) => updateField('diagnosis', e.target.value)}
            placeholder="Osteoarthritis&#10;Synovitis"
            style={{ minHeight: '120px', fontSize: '1rem', background: '#fcfdff', borderColor: '#d1e0f3' }}
          />
        </div>
      </div>

      {divider}

      {/* ══ MEDICATIONS ══ */}
      <SectionHeader
        title="Medications (Rx)"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18.5 2.5-11 11" /><path d="M2 22 L22 2" /><rect x="2" y="14" width="8" height="8" rx="2" /><path d="M7 14v8" /><path d="M2 19h8" /><rect x="14" y="2" width="8" height="8" rx="2" /></svg>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
        {data.medicines.map((med, index) => {
          if (!med) return null;
          return (
            <div key={med.id || index} className="medicine-card" style={{
              padding: '1rem',
              background: '#fff',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}>
              {/* Row 1: type + name + qty + reorder + delete */}
              {/* Row 1: Responsive Grid for Type, Name, Qty and Actions */}
              <div className="medicine-row-grid">
                <select
                  className="medicine-type-select"
                  value={med.type}
                  onChange={(e) => updateMedicine(index, 'type', e.target.value)}
                  style={{ fontWeight: 600, fontSize: '0.8rem' }}
                >
                  <option value="">Type</option>
                  <option value="TAB">TAB (Tablets)</option>
                  <option value="CAP">CAP (Capsules)</option>
                  <option value="SYP">SYP (Syrup)</option>
                  <option value="SUSP">SUSP (Suspension)</option>
                  <option value="INJ">INJ (Injection)</option>
                  <option value="GEL">GEL / OINT</option>
                  <option value="CRM">CRM (Cream)</option>
                  <option value="DRP">DRP (Drops)</option>
                  <option value="SACHET">SACHET</option>
                  <option value="POWDER">POWDER</option>
                  <option value="LOTION">LOTION</option>
                  <option value="SPRAY">SPRAY</option>
                </select>

                <div className="medicine-name-wrapper" style={{ position: 'relative' }}>
                  <input
                    placeholder="Medicine Name"
                    autoComplete="off"
                    value={med.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMedicine(index, 'name', val);
                      updateMedicine(index, 'showSuggestions', val.length > 1);
                      updateMedicine(index, 'suggestionIndex', -1);
                    }}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => handleMedKeyDown(e, index, med)}
                    style={{ fontWeight: 700, width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                  />
                  {med.showSuggestions && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      marginTop: '4px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {adminMedicines
                        .filter(am => {
                          const nameMatch = am.name.toLowerCase().includes(med.name.toLowerCase()) ||
                            (am.composition && am.composition.toLowerCase().includes(med.name.toLowerCase()));
                          if (!nameMatch) return false;
                          if (!med.type) return true;
                          const typeMap = {
                            'Tablet': 'TAB', 'Capsule': 'CAP', 'Syrup': 'SYP', 'Injection': 'INJ',
                            'Drops': 'DRP', 'Ointment': 'GEL', 'Cream': 'CRM', 'Lotion': 'LOTION', 'Spray': 'SPRAY'
                          };
                          const mappedAmType = typeMap[am.type] || am.type;
                          return mappedAmType?.toUpperCase() === med.type?.toUpperCase();
                        })
                        .map((am, idx) => (
                          <div
                            id={`suggestion-${index}-${idx}`}
                            key={am.id}
                            onClick={() => selectMedicine(index, am)}
                            onMouseEnter={() => updateMedicine(index, 'suggestionIndex', idx)}
                            style={{
                              padding: '8px 12px',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f1f5f9',
                              background: med.suggestionIndex === idx ? '#f0f4ff' : 'white',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                color: '#2563eb',
                                fontWeight: 800,
                                fontSize: '1rem',
                                opacity: med.suggestionIndex === idx ? 1 : 0.2
                              }}>
                                ➔
                              </span>
                              <span style={{ fontWeight: 700, color: '#0f172a', flex: 1 }}>
                                {am.name}
                              </span>
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#6366f1',
                                background: '#eef2ff',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {am.type}
                              </span>
                            </div>
                            {am.composition && (
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                paddingLeft: '24px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontStyle: 'italic'
                              }}>
                                {am.composition}
                              </div>
                            )}
                          </div>
                        ))
                      }
                      {adminMedicines.filter(am => {
                        const nameMatch = am.name.toLowerCase().includes(med.name.toLowerCase()) ||
                          (am.composition && am.composition.toLowerCase().includes(med.name.toLowerCase()));
                        if (!nameMatch) return false;
                        if (!med.type) return true;
                        const typeMap = {
                          'Tablet': 'TAB', 'Capsule': 'CAP', 'Syrup': 'SYP', 'Injection': 'INJ',
                          'Drops': 'DRP', 'Ointment': 'GEL', 'Cream': 'CRM', 'Lotion': 'LOTION', 'Spray': 'SPRAY'
                        };
                        const mappedAmType = typeMap[am.type] || am.type;
                        return mappedAmType?.toUpperCase() === med.type?.toUpperCase();
                      }).length === 0 && (
                          <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#64748b' }}>No matches found</div>
                        )}
                    </div>
                  )}
                </div>

                <input
                  className="medicine-qty-input"
                  placeholder="Qty"
                  value={med.qty}
                  onChange={(e) => updateMedicine(index, 'qty', e.target.value)}
                  style={{ fontWeight: 600 }}
                />

                <div className="medicine-actions">
                  {/* Reorder Arrows */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => moveMedicine(index, -1)} style={{ padding: '4px 8px', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }} disabled={index === 0}>▲</button>
                    <button type="button" onClick={() => moveMedicine(index, 1)} style={{ padding: '4px 8px', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }} disabled={index === data.medicines.length - 1}>▼</button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMedicine(index)}
                    style={{
                      background: '#fee2e2', border: 'none', color: '#ef4444',
                      cursor: 'pointer', padding: '6px', display: 'flex', borderRadius: '6px'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>

              {/* Row 2: composition */}
              <textarea
                placeholder="Composition / Notes"
                value={med.composition}
                onChange={(e) => updateMedicine(index, 'composition', e.target.value)}
                style={{ fontSize: '0.85rem', marginBottom: '0.5rem', minHeight: '52px' }}
              />

              {/* Row 3: dosage / timing / schedule / duration / remarks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <Label>Dosage</Label>
                  <div
                    onClick={() => updateMedicine(index, 'showDosageTips', true)}
                    style={{
                      display: 'flex',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'white',
                      transition: 'border-color 0.2s',
                      position: 'relative'
                    }}>
                    <input
                      placeholder="1-0-1"
                      value={med.dosage}
                      onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                      style={{ border: 'none', borderRadius: '8px 0 0 8px', flex: 1 }}
                    />
                    <div style={{ width: '1px', background: 'var(--border)' }}></div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMedicine(index, 'showDosageTips', !med.showDosageTips);
                      }}
                      style={{
                        width: '40px',
                        background: med.showDosageTips ? '#2563eb' : '#f8faff',
                        border: 'none',
                        borderRadius: '0 8px 8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: med.showDosageTips ? 'white' : '#2563eb',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg
                        style={{ transform: med.showDosageTips ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {med.showDosageTips && (
                      <>
                        <div onClick={(e) => { e.stopPropagation(); updateMedicine(index, 'showDosageTips', false); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          zIndex: 100,
                          overflow: 'hidden'
                        }}>
                          {quickDosages.map(dos => (
                            <div
                              key={dos}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMedicine(index, 'dosage', dos);
                                updateMedicine(index, 'showDosageTips', false);
                              }}
                              onMouseEnter={(e) => { e.target.style.background = '#2563eb'; e.target.style.color = 'white'; }}
                              onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = 'inherit'; }}
                              style={{
                                padding: '10px 14px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.1s',
                                borderBottom: '1px solid #f1f5f9'
                              }}
                            >
                              {dos}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <Label>Timing</Label>
                  <div
                    onClick={() => updateMedicine(index, 'showTimingTips', true)}
                    style={{
                      display: 'flex',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'white',
                      position: 'relative'
                    }}>
                    <input
                      placeholder="After Meal"
                      value={med.timing}
                      onChange={(e) => updateMedicine(index, 'timing', e.target.value)}
                      style={{ border: 'none', borderRadius: '8px 0 0 8px', flex: 1 }}
                    />
                    <div style={{ width: '1px', background: 'var(--border)' }}></div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMedicine(index, 'showTimingTips', !med.showTimingTips);
                      }}
                      style={{
                        width: '40px',
                        background: med.showTimingTips ? '#16a34a' : '#f0fdf4',
                        border: 'none',
                        borderRadius: '0 8px 8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: med.showTimingTips ? 'white' : '#16a34a',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg
                        style={{ transform: med.showTimingTips ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {med.showTimingTips && (
                      <>
                        <div onClick={(e) => { e.stopPropagation(); updateMedicine(index, 'showTimingTips', false); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          zIndex: 100,
                          overflow: 'hidden'
                        }}>
                          {timingOptions.map(opt => (
                            <div
                              key={opt}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMedicine(index, 'timing', opt);
                                updateMedicine(index, 'showTimingTips', false);
                              }}
                              onMouseEnter={(e) => { e.target.style.background = '#16a34a'; e.target.style.color = 'white'; }}
                              onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = 'inherit'; }}
                              style={{
                                padding: '10px 14px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.1s',
                                borderBottom: '1px solid #f1f5f9'
                              }}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <Label>Schedule</Label>
                  <div
                    onClick={() => updateMedicine(index, 'showScheduleTips', true)}
                    style={{
                      display: 'flex',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'white',
                      position: 'relative'
                    }}>
                    <input
                      placeholder="Daily"
                      value={med.schedule}
                      onChange={(e) => updateMedicine(index, 'schedule', e.target.value)}
                      style={{ border: 'none', borderRadius: '8px 0 0 8px', flex: 1 }}
                    />
                    <div style={{ width: '1px', background: 'var(--border)' }}></div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMedicine(index, 'showScheduleTips', !med.showScheduleTips);
                      }}
                      style={{
                        width: '40px',
                        background: med.showScheduleTips ? '#9333ea' : '#faf5ff',
                        border: 'none',
                        borderRadius: '0 8px 8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: med.showScheduleTips ? 'white' : '#9333ea',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg
                        style={{ transform: med.showScheduleTips ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {med.showScheduleTips && (
                      <>
                        <div onClick={(e) => { e.stopPropagation(); updateMedicine(index, 'showScheduleTips', false); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          zIndex: 100,
                          overflow: 'hidden'
                        }}>
                          {scheduleOptions.map(opt => (
                            <div
                              key={opt}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMedicine(index, 'schedule', opt);
                                updateMedicine(index, 'showScheduleTips', false);
                              }}
                              onMouseEnter={(e) => { e.target.style.background = '#9333ea'; e.target.style.color = 'white'; }}
                              onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = 'inherit'; }}
                              style={{
                                padding: '10px 14px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.1s',
                                borderBottom: '1px solid #f1f5f9'
                              }}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <Label>Duration</Label>
                  <div
                    onClick={() => updateMedicine(index, 'showDurationTips', true)}
                    style={{
                      display: 'flex',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'white',
                      position: 'relative'
                    }}>
                    <input
                      placeholder="30 நாட்கள்"
                      value={med.duration}
                      onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                      style={{ border: 'none', borderRadius: '8px 0 0 8px', flex: 1 }}
                    />
                    <div style={{ width: '1px', background: 'var(--border)' }}></div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMedicine(index, 'showDurationTips', !med.showDurationTips);
                      }}
                      style={{
                        width: '40px',
                        background: med.showDurationTips ? '#ea580c' : '#fff7ed',
                        border: 'none',
                        borderRadius: '0 8px 8px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: med.showDurationTips ? 'white' : '#ea580c',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <svg
                        style={{ transform: med.showDurationTips ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {med.showDurationTips && (
                      <>
                        <div onClick={(e) => { e.stopPropagation(); updateMedicine(index, 'showDurationTips', false); }} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} />
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'white',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                          zIndex: 100,
                          overflow: 'hidden'
                        }}>
                          {durationOptions.map(opt => (
                            <div
                              key={opt}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMedicine(index, 'duration', opt);
                                updateMedicine(index, 'showDurationTips', false);
                              }}
                              onMouseEnter={(e) => { e.target.style.background = '#ea580c'; e.target.style.color = 'white'; }}
                              onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = 'inherit'; }}
                              style={{
                                padding: '10px 14px',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.1s',
                                borderBottom: '1px solid #f1f5f9'
                              }}
                            >
                              {opt}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <Label>Qty</Label>
                  <input placeholder="Qty" value={med.qty} onChange={(e) => updateMedicine(index, 'qty', e.target.value)} />
                </div>
              </div>
            </div>
          )
        })}

        <button
          onClick={addMedicine}
          style={{
            background: 'white', border: '2px dashed var(--border)', color: 'var(--primary)',
            padding: '0.75rem', borderRadius: '10px', fontWeight: 700, width: '100%', fontSize: '0.9rem'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-subtle)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white'; }}
        >
          + Add Medication
        </button>
      </div>

      {divider}

      {/* ══ ADVICE & FOLLOW UP ══ */}
      <SectionHeader
        title="Advice & Follow-up"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>}
      />

      <div style={{ marginBottom: '1.25rem' }}>
        <Label>Advice (one per line)</Label>
        <textarea
          rows="6"
          value={data.advice}
          onChange={(e) => updateField('advice', e.target.value)}
          placeholder="Physio advised&#10;Hot water massage&#10;Exercises"
          style={{ minHeight: '150px', fontSize: '1rem', background: '#fafffa', borderColor: '#dcfce7' }}
        />
      </div>

      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <Label>Follow-up Date</Label>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="date"
            value={data.followUp}
            onChange={(e) => updateField('followUp', e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {[3, 5, 7, 10, 15, 30].map(days => (
            <button
              key={days}
              type="button"
              onClick={() => setFollowUpInDays(days)}
              style={{
                padding: '6px 10px',
                fontSize: '0.75rem',
                background: 'white',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--primary)'; }}
            >
              {days === 7 ? '1 Week' : days === 30 ? '1 Month' : `${days} Days`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const days = getAutoFollowUpDays();
              if (days > 0) setFollowUpInDays(days);
              else alert('No medicine duration found to calculate follow-up.');
            }}
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              background: 'var(--primary)',
              color: 'white',
              border: '1px solid var(--primary)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            Auto (from meds)
          </button>
        </div>
      </div>



      {/* ══ HISTORY PREVIEW MODAL ══ */}
      {isViewModalOpen && patientHistory[activeHistoryIndex] && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: window.innerWidth < 600 ? '0' : '16px',
            width: window.innerWidth < 600 ? '100%' : '90%',
            maxWidth: '900px',
            height: window.innerWidth < 600 ? '100%' : '90%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 800 }}>Visit: {patientHistory[activeHistoryIndex].date}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Gesture-ready Viewer</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => { setIsViewModalOpen(false); setIsModalZoomed(false); }}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    color: '#64748b'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div
              onClick={() => { if (window.innerWidth < 600) setIsModalZoomed(!isModalZoomed); }}
              style={{
                flex: '1 1 auto',
                overflowY: 'auto',
                padding: isModalZoomed ? '0' : (window.innerWidth < 600 ? '0.5rem' : '2rem'),
                background: '#f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isModalZoomed ? 'flex-start' : 'center',
                cursor: window.innerWidth < 600 ? 'zoom-in' : 'default',
                minHeight: 0
              }}
            >
              <div style={{
                background: 'white',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                width: '210mm',
                transformOrigin: 'top center',
                transform: isModalZoomed
                  ? (window.innerWidth < 600 ? 'scale(0.85)' : 'scale(1)')
                  : (window.innerWidth < 600 ? 'scale(0.35)' : window.innerWidth < 1000 ? 'scale(0.65)' : 'scale(1)'),
                transition: 'transform 0.2s ease-out',
                marginBottom: isModalZoomed
                  ? '2rem'
                  : (window.innerWidth < 600 ? 'calc((297mm * 0.35) - 297mm + 2rem)' : window.innerWidth < 1000 ? 'calc((297mm * 0.65) - 297mm + 2rem)' : '2rem'),
                marginLeft: 'auto',
                marginRight: 'auto'
              }}>
                <PrescriptionPreview data={{
                  ...patientHistory[activeHistoryIndex],
                  mrn: data.mrn,
                  patientName: data.patientName,
                  age: data.age,
                  gender: data.gender,
                  phone: data.phone,
                  doctorQualifications: patientHistory[activeHistoryIndex].doctorQualifications || '',
                  doctorRegNo: patientHistory[activeHistoryIndex].doctorRegNo || ''
                }} />
              </div>
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc' }}>
              <button
                onClick={() => { setIsViewModalOpen(false); setIsModalZoomed(false); }}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionForm;
