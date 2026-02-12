import React, { useState, useEffect, useMemo } from 'react';
import UploadModal from './components/UploadModal';
import Histogram from './components/Histogram';
import { dataStore } from './stores/dataStore';
import './App.css';

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sampleData] = useState(() => 
    Array(100).fill(null).map((_, i) => ({
      id: i,
      assay_value: Math.random() * 100,
      depth: Math.random() * 500,
      grade: Math.random() * 10
    }))
  );

  const loadDatasets = async () => {
    setLoading(true);
    await dataStore.fetchDatasets();
    setDatasets(dataStore.datasets);
    setLoading(false);
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get columns from selected dataset
  const datasetColumns = useMemo(() => {
    if (!selectedDataset) return [];
    // In a real app, this would come from the API
    return selectedDataset.columnMappings?.map(m => m.targetField) || [];
  }, [selectedDataset]);

  const [selectedColumn, setSelectedColumn] = useState('');

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <h1>🏔️ GeoMetrics</h1>
        <nav className="nav">
          <button className="nav-btn active">Dashboard</button>
          <button className="nav-btn" onClick={() => setModalOpen(true)}>Data Loading</button>
          <button className="nav-btn">Visualizations</button>
          <button className="nav-btn">Analysis</button>
        </nav>
        <button 
          className="upload-btn"
          onClick={() => setModalOpen(true)}
        >
          + Upload Data
        </button>
      </header>

      {/* Main 4-panel layout */}
      <div className="main-content">
        {/* Panel 1: Control Panel (Left) */}
        <aside className="panel control-panel">
          <h2>Controls</h2>
          <div className="panel-content">
            <div className="control-section">
              <h3>Dataset Selection</h3>
              {datasets.length > 0 ? (
                <select 
                  className="control-select"
                  value={selectedDataset?.id || ''}
                  onChange={(e) => {
                    const ds = datasets.find(d => d.id === e.target.value);
                    setSelectedDataset(ds);
                    setSelectedColumn('');
                  }}
                >
                  <option value="">Select dataset...</option>
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id}>{ds.name}</option>
                  ))}
                </select>
              ) : (
                <p className="placeholder-text">No datasets available</p>
              )}
            </div>
            
            <div className="control-section">
              <h3>Column Selection</h3>
              {selectedDataset && datasetColumns.length > 0 ? (
                <select 
                  className="control-select"
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                >
                  <option value="">Select column...</option>
                  {datasetColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              ) : (
                <p className="placeholder-text">
                  {selectedDataset ? 'No columns mapped' : 'Select a dataset first'}
                </p>
              )}
            </div>

            <div className="control-section">
              <h3>Sample Data</h3>
              <button 
                className="control-btn"
                onClick={() => {
                  setSelectedDataset({ id: 'sample', name: 'Sample Assay Data' });
                  setSelectedColumn('assay_value');
                }}
              >
                Load Sample Assay Data
              </button>
            </div>
          </div>
        </aside>

        {/* Panel 2: Main Visualization (Center-Left) */}
        <section className="panel main-view">
          <h2>Histogram View</h2>
          <div className="panel-content view-area">
            {selectedColumn ? (
              <Histogram 
                data={selectedDataset?.id === 'sample' ? sampleData : []}
                column={selectedColumn}
                title={`Distribution: ${selectedColumn}`}
                width={500}
                height={350}
                binCount={25}
                color="#e94560"
              />
            ) : (
              <div className="empty-state">
                <span className="empty-icon">📊</span>
                <p>No visualization selected</p>
                <p className="empty-hint">Select a dataset and column to view histogram</p>
              </div>
            )}
          </div>
        </section>

        {/* Panel 3: Data Panel (Center-Right) */}
        <section className="panel data-panel">
          <h2>Datasets ({datasets.length})</h2>
          <div className="panel-content">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : datasets.length === 0 ? (
              <div className="empty-datasets">
                <p>No datasets loaded</p>
                <button 
                  className="btn-small"
                  onClick={() => setModalOpen(true)}
                >
                  Upload CSV
                </button>
              </div>
            ) : (
              <div className="dataset-list">
                {datasets.map(ds => (
                  <div 
                    key={ds.id} 
                    className={`dataset-item ${selectedDataset?.id === ds.id ? 'selected' : ''}`}
                    onClick={() => setSelectedDataset(ds)}
                  >
                    <div className="dataset-header">
                      <span className="dataset-name">{ds.name}</span>
                      <span className={`status-badge ${ds.status}`}>
                        {ds.status}
                      </span>
                    </div>
                    <div className="dataset-meta">
                      <span>{ds.rowCount} rows</span>
                      <span>{ds.columnCount} cols</span>
                    </div>
                    <div className="dataset-date">
                      {formatDate(ds.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Panel 4: Status/Info Panel (Right) */}
        <aside className="panel info-panel">
          <h2>Info</h2>
          <div className="panel-content">
            <div className="info-section">
              <h3>System Status</h3>
              <div className="status-item">
                <span className="status-dot online"></span>
                <span>API Connected</span>
              </div>
            </div>
            
            {selectedDataset && (
              <div className="info-section">
                <h3>Selected Dataset</h3>
                <p className="info-value">{selectedDataset.name}</p>
                {selectedColumn && (
                  <p className="info-subvalue">Column: {selectedColumn}</p>
                )}
              </div>
            )}
            
            <div className="info-section">
              <h3>Environment</h3>
              <p className="env-info">{import.meta.env.MODE || 'development'}</p>
            </div>
            
            <div className="info-section">
              <h3>Quick Actions</h3>
              <button className="action-btn" onClick={() => setModalOpen(true)}>
                📤 Upload Data
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Footer status bar */}
      <footer className="footer">
        <span>✅ Ready</span>
        <span>|</span>
        <span>API: {import.meta.env.VITE_API_URL || 'http://localhost:3001'}</span>
        <span>|</span>
        <span>Datasets: {datasets.length}</span>
        {selectedColumn && (
          <>
            <span>|</span>
            <span>Visualizing: {selectedColumn}</span>
          </>
        )}
      </footer>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={modalOpen} 
        onClose={() => {
          setModalOpen(false);
          loadDatasets();
        }} 
      />
    </div>
  );
}

export default App;
