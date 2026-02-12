# GeoMetrics Frontend QA Review

**Date:** 2025-02-12  
**Tester:** Delta-QA  
**Issue:** Frontend at http://localhost:5173 appears blank

---

## 1. Issue Description

The GeoMetrics frontend application loads at http://localhost:5173 but displays a blank white screen. The Vite dev server is running, but the application does not render any content.

---

## 2. Root Cause Analysis

### Primary Finding: Backend API Server Not Running

| Component | Status | Port | Notes |
|-----------|--------|------|-------|
| Vite Frontend | ✅ Running | 5173 | Serving content correctly |
| GeoMetrics Backend | ❌ NOT RUNNING | 3001/3002 | Not started |
| Next.js Server (ProjectHub) | ✅ Running | 3001 | Unrelated process |

### Secondary Issue: API URL Configuration Mismatch

**File:** `/home/clawdbot/geometrics/frontend/src/stores/dataStore.js`

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

The frontend is hardcoded to connect to port 3001, which is currently occupied by an unrelated Next.js server (ProjectHub), not the GeoMetrics backend.

### Technical Details

1. **Vite Server Status:**
   - Process ID: 837729
   - Serving HTML correctly at `/`
   - App.jsx and all components are accessible

2. **Backend Server Status:**
   - Backend source code exists at `/home/clawdbot/geometrics/backend/src/index.js`
   - Backend is configured to run on port 3001 (or env PORT)
   - Backend process is NOT currently running
   - No process listening on port 3002

3. **Frontend Code Analysis:**
   - All files present: App.jsx, components/, stores/, CSS files
   - No syntax errors in source code
   - Build completes successfully (`npm run build` passes)
   - Bundle size: 8.24 kB (small but functional)

---

## 3. Steps to Reproduce

1. Navigate to http://localhost:5173 in a browser
2. Observe blank white screen
3. Open browser developer console
4. Expected: Fetch error when `dataStore.fetchDatasets()` attempts API call
5. Expected: CORS or network error due to backend not running

---

## 4. Severity Rating

**Severity: HIGH**

**Justification:**
- Application is completely non-functional (100% failure)
- No content renders to users
- Affects all features (data loading, visualization, analysis)
- No workaround available without backend

**Business Impact:**
- Users cannot upload datasets
- No visualizations can be displayed
- Core platform functionality broken

---

## 5. Recommended Fix

### Immediate Actions

1. **Start the GeoMetrics Backend:**
   ```bash
   cd /home/clawdbot/geometrics/backend
   npm start
   # OR for development with hot reload:
   npm run dev
   ```

2. **Verify Backend is Running:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

### Configuration Improvements

1. **Update dataStore.js to use correct default:**
   ```javascript
   // Consider using environment variable
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
   ```

2. **Create .env file for frontend:**
   ```
   VITE_API_URL=http://localhost:3002
   ```

3. **Update vite.config.js to proxy API calls:**
   ```javascript
   server: {
     port: 5173,
     proxy: {
       '/api': {
         target: 'http://localhost:3002',
         changeOrigin: true
       }
     }
   }
   ```

### Additional Recommendations

1. **Add error handling in App.jsx:**
   - Display error message when API connection fails
   - Show user-friendly fallback UI

2. **Add loading state handling:**
   - The current loading state shows "Loading..." but may not be visible if app fails early

3. **Verify port configuration:**
   - Confirm backend should use port 3002 (per context) or document preferred port
   - Ensure no port conflicts with ProjectHub (port 3001)

---

## 6. Verification Steps

After fix is implemented:

1. Start backend: `cd /home/clawdbot/geometrics/backend && npm run dev`
2. Navigate to http://localhost:5173
3. Verify content renders (header, panels, footer)
4. Check browser console for errors
5. Verify API connectivity

---

## Summary

The blank page is caused by the GeoMetrics backend server not running. The frontend Vite server is operational, but the React application fails silently when it cannot connect to the API server. Starting the backend service should resolve the issue.
