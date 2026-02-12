// DataStore - Simple reactive state management without external dependencies
// Using native JavaScript Proxies for reactivity

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Simple reactive wrapper using Proxy
function reactive(initialValue) {
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
  
  return new Proxy(Array.isArray(initialValue) ? [] : initialValue, handler);
}

class DataStore {
  datasets = reactive([]);
  loading = reactive(false);
  error = reactive(null);
  currentDataset = reactive(null);

  async fetchDatasets() {
    this.loading = true;
    this.error = null;
    try {
      const res = await fetch(`${API_URL}/api/data/datasets`);
      const data = await res.json();
      this.datasets = data.datasets || [];
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  }

  async uploadDataset(file) {
    this.loading = true;
    this.error = null;
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
      this.error = err.message;
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async saveMappings(datasetId, mappings) {
    this.loading = true;
    this.error = null;
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
      this.error = err.message;
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async deleteDataset(id) {
    this.loading = true;
    this.error = null;
    try {
      const res = await fetch(`${API_URL}/api/data/datasets/${id}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) throw new Error('Failed to delete');
      
      await this.fetchDatasets();
    } catch (err) {
      this.error = err.message;
      throw err;
    } finally {
      this.loading = false;
    }
  }
}

export const dataStore = new DataStore();
