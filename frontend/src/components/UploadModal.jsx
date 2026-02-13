import React, { useState, useEffect } from 'react';
import { dataStore } from '../stores/dataStore';
import './UploadModal.css';

export default function UploadModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [mappings, setMappings] = useState([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFile(null);
      setDataset(null);
      setMappings([]);
    }
  }, [isOpen]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        uploadFile(droppedFile);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        uploadFile(selectedFile);
      }
    }
  };

  const uploadFile = async (uploadFile) => {
    try {
      const uploadedDataset = await dataStore.uploadDataset(uploadFile);
      setDataset(uploadedDataset);
      
      // Initialize mappings with source columns
      const initialMappings = uploadedDataset.columns.map(col => ({
        sourceColumn: col,
        targetField: col,
        dataType: 'string'
      }));
      setMappings(initialMappings);
      setStep(2);
    } catch (err) {
      alert('Failed to upload file: ' + err.message);
    }
  };

  const updateMapping = (index, field, value) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setMappings(newMappings);
  };

  const handleSaveMappings = async () => {
    setSaving(true);
    try {
      await dataStore.saveMappings(dataset.id, mappings);
      setStep(3);
    } catch (err) {
      alert('Failed to save mappings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setDataset(null);
    setMappings([]);
    setStep(1);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📂 Data Loading</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Step 1: File Upload */}
          {step === 1 && (
            <div className="upload-step">
              <div 
                className={`dropzone ${dragActive ? 'active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="dropzone-icon">📄</div>
                <p>Drag & drop your CSV file here</p>
                <p className="subtext">or</p>
                <label className="file-input-label">
                  Browse Files
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileSelect}
                    hidden 
                  />
                </label>
                <p className="file-types">Supports .csv files only</p>
              </div>
              
              {dataStore.loading.value && (
                <div className="upload-status">
                  <span className="spinner"></span>
                  <p>Uploading file...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && dataset && (
            <div className="mapping-step">
              <div className="dataset-info">
                <h3>{dataset.name}</h3>
                <p>{dataset.rowCount} rows × {dataset.columnCount} columns</p>
              </div>

              <div className="mapping-table-container">
                <table className="mapping-table">
                  <thead>
                    <tr>
                      <th>Source Column</th>
                      <th>Target Field</th>
                      <th>Data Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((mapping, idx) => (
                      <tr key={idx}>
                        <td>{mapping.sourceColumn}</td>
                        <td>
                          <input 
                            type="text" 
                            value={mapping.targetField}
                            onChange={(e) => updateMapping(idx, 'targetField', e.target.value)}
                            className="field-input"
                          />
                        </td>
                        <td>
                          <select 
                            value={mapping.dataType}
                            onChange={(e) => updateMapping(idx, 'dataType', e.target.value)}
                            className="type-select"
                          >
                            <option value="string">String</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                            <option value="coordinate">Coordinate</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mapping-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveMappings}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Mappings'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="success-step">
              <div className="success-icon">✅</div>
              <h3>Data Loaded Successfully!</h3>
              <p>Your dataset has been uploaded and mapped.</p>
              <button className="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
