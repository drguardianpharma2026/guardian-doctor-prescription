import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const AdminDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('medicines')
  const [medicines, setMedicines] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [clinicSettings, setClinicSettings] = useState({
    name: 'THULIR MULTISPECIALITY HOSPITAL',
    phone: '04366 222108, 70949 19494, 70949 29494'
  })
  const navigate = useNavigate()

  useEffect(() => {
    const savedMeds = localStorage.getItem('admin_medicines')
    if (savedMeds) {
      setMedicines(JSON.parse(savedMeds))
    } else {
      import('../data/products.json').then(data => {
        setMedicines(data.default)
      }).catch(() => setMedicines([]))
    }

    const savedSettings = localStorage.getItem('admin_clinic_settings')
    if (savedSettings) {
      setClinicSettings(JSON.parse(savedSettings))
    }
  }, [])

  const saveMedicines = (newList) => {
    setMedicines(newList)
    localStorage.setItem('admin_medicines', JSON.stringify(newList))
  }

  const handleAddMedicine = () => {
    const newMed = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      type: 'Tablet',
      composition: '',
      category: ''
    }
    saveMedicines([newMed, ...medicines])
  }

  const handleUpdateMed = (id, field, value) => {
    const newList = medicines.map(m => m.id === id ? { ...m, [field]: value } : m)
    saveMedicines(newList)
  }

  const handleDeleteMed = (id) => {
    if (window.confirm('Delete this row?')) {
      const newList = medicines.filter(m => m.id !== id)
      saveMedicines(newList)
    }
  }

  const handleSaveSettings = (e) => {
    e.preventDefault()
    localStorage.setItem('admin_clinic_settings', JSON.stringify(clinicSettings))
    alert('Settings Saved Successfully')
  }

  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.category.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="excel-admin">
      {/* ── Sidebar ── */}
      <aside className="excel-sidebar">
        <div className="excel-logo">
          <div className="logo-box">G</div>
          <span>Guardian Admin</span>
        </div>
        
        <nav>
          <button className={activeTab === 'medicines' ? 'active' : ''} onClick={() => setActiveTab('medicines')}>
            <span className="icon">📂</span> Medicine Master
          </button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>
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
          <div className="header-left">
            <h1>{activeTab === 'medicines' ? 'Medicine Database Grid' : 'System Configuration'}</h1>
            <p>{medicines.length} Rows found</p>
          </div>
          
          {activeTab === 'medicines' && (
            <div className="header-right">
              <div className="excel-search">
                <input 
                  placeholder="Quick Search (Ctrl + F)..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={handleAddMedicine} className="excel-add-btn">+ Add New Row</button>
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
                    <th>Category</th>
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
                          placeholder="Enter Name..."
                        />
                      </td>
                      <td>
                        <select 
                          value={med.type} 
                          onChange={(e) => handleUpdateMed(med.id, 'type', e.target.value)}
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
                          placeholder="e.g. 500mg"
                        />
                      </td>
                      <td>
                        <input 
                          value={med.category} 
                          onChange={(e) => handleUpdateMed(med.id, 'category', e.target.value)}
                          placeholder="Category..."
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
      ` }} />
    </div>
  )
}

export default AdminDashboard
