// DataStore - Simple reactive state management without external dependencies
// Using native JavaScript Proxies for reactivity

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Simple reactive wrapper using Proxy
function reactive(initialValue) {
  // Wrap primitives in an object so Proxy can work with them
  const target = typeof initialValue === 'object' && initialValue !== null 
    ? initialValue 
    : { value: initialValue };
  const listeners = new Set();
  
  const handler = {
    get(target, property) {
      if (property === '_subscribe') {
        return (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        };
      }
      return target[property];
    },
    set(target, property, value) {
      const oldValue = target[property];
      target[property] = value;
      if (oldValue !== value) {
        listeners.forEach(listener => listener(value, oldValue));
      }
      return true;
    }
  };
  
  return new Proxy(target, handler);
}

class DataStore {
  datasets = reactive([]);
  loading = reactive({ value: false });
  error = reactive({ value: null });
  apiStatus = reactive({ value: 'unknown' }); // 'connected' | 'disconnected' | 'checking'
  currentDataset = reactive({ value: null });
  histogramData = reactive({ value: null });
  rawData = reactive([]);

  // Health check to detect if backend is available
  async checkApiHealth() {
    this.apiStatus.value = 'checking';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${API_URL}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        this.apiStatus.value = 'connected';
        return true;
      } else {
        this.apiStatus.value = 'disconnected';
        return false;
      }
    } catch (err) {
      this.apiStatus = 'disconnected';
      return false;
    }
  }

  async fetchDatasets() {
    this.loading.value = true;
    this.error.value = null;
    try {
      const res = await fetch(`${API_URL}/api/data/datasets`);
      const data = await res.json();
      this.datasets = data.datasets || [];
    } catch (err) {
      this.error.value = err.message;
    } finally {
      this.loading.value = false;
    }
  }

  async uploadDataset(file) {
    this.loading.value = true;
    this.error.value = null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`${API_URL}/api/data/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      await this.fetchDatasets();
      return data.dataset;
    } catch (err) {
      this.error.value = err.message;
      throw err;
    } finally {
      this.loading.value = false;
    }
  }

  async fetchHistogramData(datasetId, column, bins = 20) {
    this.loading.value = true;
    this.error.value = null;
    try {
      const res = await fetch(`${API_URL}/api/histogram?dataset_id=${datasetId}&column=${encodeURIComponent(column)}&bins=${bins}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch histogram');
      }
      const data = await res.json();
      this.histogramData.value = data;
      return data;
    } catch (err) {
      this.error.value = err.message;
      throw err;
    } finally {
      this.loading.value = false;
    }
  }

  async fetchRawData(datasetId, columns = null, limit = 10000) {
    this.loading.value = true;
    this.error.value = null;
    try {
      let url = `${API_URL}/api/data/datasets/${datasetId}/data?limit=${limit}`;
      if (columns) {
        url += `&columns=${columns}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch data');
      }
      const data = await res.json();
      this.rawData = data.data || [];
      return data;
    } catch (err) {
      this.error.value = err.message;
      throw err;
    } finally {
      this.loading.value = false;
    }
  }

  async saveMappings(datasetId, mappings) {
    this.loading.value = true;
    this.error.value = null;
    try {
      const res = await fetch(`${API_URL}/api/data/datasets/${datasetId}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings })
      });
      
      if (!res.ok) throw new Error('Failed to save mappings');
      
      await this.fetchDatasets();
      return await res.json();
    } catch (err) {
      this.error.value = err.message;
      throw err;
    } finally {
      this.loading.value = false;
    }
  }

  async deleteDataset(id) {
    this.loading.value = true;
    this.error.value = null;
    try {
      const res = await fetch(`${API_URL}/api/data/datasets/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      
      await this.fetchDatasets();
    } catch (err) {
      this.error.value = err.message;
      throw err;
    } finally {
      this.loading.value = false;
    }
  }
}

export const dataStore = new DataStore();
