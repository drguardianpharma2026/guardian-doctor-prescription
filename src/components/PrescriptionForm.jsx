import React from 'react';

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
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
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

const PrescriptionForm = ({ data, setData, savedDoctors, onDoctorSelect, onSaveDoctor, onDeleteDoctor }) => {
  const [showDoctorDropdown, setShowDoctorDropdown] = React.useState(false);

  const updateField = (field, value) => {
    let newData = { ...data, [field]: value };
    
    // Auto-prefix Patient Name based on Gender
    if (field === 'gender' && value) {
      let name = data.patientName.trim();
      const titles = ['Mr.', 'Mrs.', 'Ms.', 'Master.', 'Miss.', 'Dr.'];
      
      // Find if existing name has a title
      let baseName = name;
      let existingTitle = '';
      for (const t of titles) {
        if (name.toLowerCase().startsWith(t.toLowerCase() + ' ')) {
          existingTitle = t;
          baseName = name.substring(t.length + 1).trim();
          break;
        }
      }
      
      let newPrefix = '';
      if (value === 'Male' || value === 'Y/M') {
        newPrefix = 'Mr. ';
      } else if (value === 'Female' || value === 'Y/F') {
        newPrefix = 'Mrs. ';
      }
      
      if (newPrefix && baseName) {
        newData.patientName = newPrefix + baseName;
      } else if (newPrefix && !baseName) {
        // If name is empty, just set the prefix for the user to continue typing
        newData.patientName = newPrefix;
      }
    }
    
    setData(newData);
  };

  const setFollowUpInDays = (days) => {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);
    
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
    setData({
      ...data,
      medicines: [...data.medicines, { id: Math.random().toString(36).substr(2, 9), type: '', name: '', composition: '', dosage: '', timing: '', schedule: '', duration: '', qty: '', showDosageTips: false, showTimingTips: false, showDurationTips: false, showScheduleTips: false }]
    });
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

  const handleClearPatient = () => {
    if (confirm('Clear all patient and clinical data?')) {
      setData({
        ...data,
        mrn: '', visitNo: '', patientName: '', age: '', gender: '', phone: '',
        complaints: '', diagnosis: '',
        medicines: [{ id: Math.random().toString(36).substr(2, 9), type: '', name: '', composition: '', dosage: '', timing: '', schedule: '', duration: '', qty: '', showDosageTips: false, showTimingTips: false, showDurationTips: false, showScheduleTips: false }],
        advice: '', followUp: ''
      });
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
    'OD MOR 1-0-0',
    'OD 0-1-0',
    'OD 0-0-1',
    'BD 1-0-1',
    'TDS 1-1-1',
    'TDS 2-2-2'
  ];

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <datalist id="timing-list">
        {timingOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>
      <datalist id="schedule-list">
        {scheduleOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>



      {/* ══ DOCTOR SETUP ══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <SectionHeader
          title="Doctor Setup"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}
        />
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
              <path d="m6 9 6 6 6-6"/>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <Label>Doctor Name</Label>
          <input type="text" value={data.doctorName} onChange={(e) => updateField('doctorName', e.target.value)} placeholder="Dr. Name" />
        </div>
        <div>
          <Label>Qualifications</Label>
          <input type="text" value={data.doctorQualifications} onChange={(e) => updateField('doctorQualifications', e.target.value)} placeholder="BDS., MDS." />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Specialization / Role</Label>
          <input type="text" value={data.doctorRole} onChange={(e) => updateField('doctorRole', e.target.value)} placeholder="Role description" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Label>Registration Number (Reg No)</Label>
          <input type="text" value={data.doctorRegNo || ''} onChange={(e) => updateField('doctorRegNo', e.target.value)} placeholder="Reg No - 93179" />
        </div>
      </div>

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

      {divider}

      {/* ══ PATIENT INFO ══ */}
      <SectionHeader
        title="Patient Info"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
      />

      {/* Row 1: MRN & Date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <Label>MRN (Patient ID)</Label>
          <input type="text" value={data.mrn} onChange={(e) => updateField('mrn', e.target.value)} placeholder="07042" />
        </div>
        <div>
          <Label>Date</Label>
          <input type="date" value={data.date} onChange={(e) => updateField('date', e.target.value)} />
        </div>
      </div>
      
      {/* Row 2: Large Patient Name & Age */}
      <div style={{ display: 'grid', gridTemplateColumns: '3.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <Label>Patient Name</Label>
          <input type="text" value={data.patientName} onChange={(e) => updateField('patientName', e.target.value)} placeholder="Full Name" style={{ fontWeight: 700, fontSize: '1rem' }} />
        </div>
        <div>
          <Label>Age</Label>
          <input type="text" value={data.age} onChange={(e) => updateField('age', e.target.value)} placeholder="Age" />
        </div>
      </div>

      {/* Row 3: Gender & Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <Label>Gender</Label>
          <select value={data.gender} onChange={(e) => updateField('gender', e.target.value)}>
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

      <button
        onClick={handleClearPatient}
        style={{
          width: '100%', padding: '0.6rem', background: 'white',
          color: '#64748b', border: '1px solid var(--border)', borderRadius: '8px',
          fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: '0'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
      >
        🗑 Reset Patient Data
      </button>

      {divider}

      {/* ══ CLINICAL DETAILS ══ */}
      <SectionHeader
        title="Clinical Details"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <Label>Chief Complaints (one per line)</Label>
          <textarea rows="2" value={data.complaints} onChange={(e) => updateField('complaints', e.target.value)} placeholder="Pain right knee&#10;Swelling" />
        </div>
        <div>
          <Label>Provisional Diagnosis (one per line)</Label>
          <textarea rows="2" value={data.diagnosis} onChange={(e) => updateField('diagnosis', e.target.value)} placeholder="Osteoarthritis&#10;Synovitis" />
        </div>
      </div>

      {divider}

      {/* ══ MEDICATIONS ══ */}
      <SectionHeader
        title="Medications (Rx)"
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18.5 2.5-11 11"/><path d="M2 22 L22 2"/><rect x="2" y="14" width="8" height="8" rx="2"/><path d="M7 14v8"/><path d="M2 19h8"/><rect x="14" y="2" width="8" height="8" rx="2"/></svg>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
        {data.medicines.map((med, index) => (
          <div key={med.id || index} style={{
            padding: '1rem', background: '#fff', border: '1px solid var(--border)',
            borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
          }}>
            {/* Row 1: type + name + qty + reorder + delete */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
              <select
                value={med.type}
                onChange={(e) => updateMedicine(index, 'type', e.target.value)}
                style={{ width: '110px', fontWeight: 600, fontSize: '0.8rem' }}
              >
                <option value="">Type</option>
                <option value="TABLETS">TABLETS</option>
                <option value="CAPSULES">CAPSULES</option>
                <option value="GEL">GEL</option>
                <option value="SYRUP">SYRUP</option>
                <option value="INJECTION">INJECTION</option>
                <option value="DROPS">DROPS (EYE/EAR)</option>
                <option value="CREAM">CREAM</option>
                <option value="OINTMENT">OINTMENT</option>
                <option value="SUSPENSION">SUSPENSION</option>
                <option value="POWDER">POWDER</option>
                <option value="INHALER">INHALER</option>
                <option value="SPRAY">SPRAY</option>
                <option value="LOTION">LOTION</option>
              </select>
              <input placeholder="Medicine Name" value={med.name} onChange={(e) => updateMedicine(index, 'name', e.target.value)} style={{ fontWeight: 600 }} />
              <input placeholder="Qty" value={med.qty} onChange={(e) => updateMedicine(index, 'qty', e.target.value)} style={{ width: '60px' }} />
              
              {/* Reorder Arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <button type="button" onClick={() => moveMedicine(index, -1)} style={{ padding: '2px', fontSize: '10px', height: '18px', background: 'none', border: '1px solid #ddd', cursor: 'pointer' }} disabled={index === 0}>▲</button>
                <button type="button" onClick={() => moveMedicine(index, 1)} style={{ padding: '2px', fontSize: '10px', height: '18px', background: 'none', border: '1px solid #ddd', cursor: 'pointer' }} disabled={index === data.medicines.length - 1}>▼</button>
              </div>

              <button
                type="button"
                onClick={() => removeMedicine(index)}
                style={{
                  background: 'none', border: 'none', color: '#ff4d4d',
                  cursor: 'pointer', padding: '0.5rem', display: 'flex'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
            {/* Row 2: composition */}
            <textarea
              placeholder="Composition / Notes"
              value={med.composition}
              onChange={(e) => updateMedicine(index, 'composition', e.target.value)}
              style={{ fontSize: '0.85rem', marginBottom: '0.5rem', minHeight: '52px' }}
            />
            {/* Row 3: dosage / timing / schedule / duration / remarks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '4px' }}>
                  <Label style={{ margin: 0 }}>Dosage</Label>
                  <button 
                    type="button" 
                    onClick={() => updateMedicine(index, 'showDosageTips', !med.showDosageTips)}
                    style={{ 
                      background: '#e3f2fd', border: '1px solid #2196f3', padding: '1px 4px', cursor: 'pointer', 
                      display: 'flex', color: '#1976d2', borderRadius: '4px',
                      transform: med.showDosageTips ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
                <input placeholder="1-0-1" value={med.dosage} onChange={(e) => updateMedicine(index, 'dosage', e.target.value)} />
                {med.showDosageTips && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem', background: '#f8faff', padding: '0.5rem', borderRadius: '8px', border: '1px solid #bbdefb' }}>
                    {quickDosages.map(dos => (
                      <button
                        key={dos}
                        type="button"
                        onClick={() => {
                          updateMedicine(index, 'dosage', dos);
                          updateMedicine(index, 'showDosageTips', false);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          background: '#fff',
                          color: '#1976d2',
                          border: '1px solid #90caf9',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        {dos}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '4px' }}>
                  <Label style={{ margin: 0 }}>Timing</Label>
                  <button 
                    type="button" 
                    onClick={() => updateMedicine(index, 'showTimingTips', !med.showTimingTips)}
                    style={{ 
                      background: '#e8f5e9', border: '1px solid #4caf50', padding: '1px 4px', cursor: 'pointer', 
                      display: 'flex', color: '#2e7d32', borderRadius: '4px',
                      transform: med.showTimingTips ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
                <input list="timing-list" placeholder="After Meal" value={med.timing} onChange={(e) => updateMedicine(index, 'timing', e.target.value)} />
                {med.showTimingTips && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem', background: '#f1f8e9', padding: '0.5rem', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                    {timingOptions.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          updateMedicine(index, 'timing', opt);
                          updateMedicine(index, 'showTimingTips', false);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          background: '#fff',
                          color: '#2e7d32',
                          border: '1px solid #a5d6a7',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '4px' }}>
                  <Label style={{ margin: 0 }}>Schedule</Label>
                  <button 
                    type="button" 
                    onClick={() => updateMedicine(index, 'showScheduleTips', !med.showScheduleTips)}
                    style={{ 
                      background: '#f3e5f5', border: '1px solid #9c27b0', padding: '1px 4px', cursor: 'pointer', 
                      display: 'flex', color: '#7b1fa2', borderRadius: '4px',
                      transform: med.showScheduleTips ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
                <input placeholder="Daily" value={med.schedule} onChange={(e) => updateMedicine(index, 'schedule', e.target.value)} />
                {med.showScheduleTips && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem', background: '#f3e5f5', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ce93d8' }}>
                    {scheduleOptions.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          updateMedicine(index, 'schedule', opt);
                          updateMedicine(index, 'showScheduleTips', false);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          background: '#fff',
                          color: '#7b1fa2',
                          border: '1px solid #ba68c8',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '4px' }}>
                  <Label style={{ margin: 0 }}>Duration</Label>
                  <button 
                    type="button" 
                    onClick={() => updateMedicine(index, 'showDurationTips', !med.showDurationTips)}
                    style={{ 
                      background: '#fff3e0', border: '1px solid #ff9800', padding: '1px 4px', cursor: 'pointer', 
                      display: 'flex', color: '#e65100', borderRadius: '4px',
                      transform: med.showDurationTips ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
                <input placeholder="30 நாட்கள்" value={med.duration} onChange={(e) => updateMedicine(index, 'duration', e.target.value)} />
                {med.showDurationTips && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem', background: '#fff8e1', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ffe082' }}>
                    {durationOptions.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          updateMedicine(index, 'duration', opt);
                          updateMedicine(index, 'showDurationTips', false);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '0.75rem',
                          background: '#fff',
                          color: '#e65100',
                          border: '1px solid #ffcc80',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Qty</Label>
                <input placeholder="Qty" value={med.qty} onChange={(e) => updateMedicine(index, 'qty', e.target.value)} />
              </div>
            </div>
          </div>
        ))}

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
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
      />

      <div style={{ marginBottom: '0.75rem' }}>
        <Label>Advice (one per line)</Label>
        <textarea rows="3" value={data.advice} onChange={(e) => updateField('advice', e.target.value)} placeholder="Physio advised&#10;Hot water massage&#10;Exercises" />
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Auto (from meds)
          </button>
        </div>
      </div>

    </div>
  );
};

export default PrescriptionForm;
