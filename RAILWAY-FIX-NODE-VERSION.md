# Railway Fix: Node.js Version Upgrade

**Date:** December 5, 2025
**Status:** ✅ FIXED

---

## Problem

Railway backend was showing:
- ❌ `automationScheduler: false` (7/9 services loaded)
- ❌ `queueWorker: false`
- ❌ Lead generation not working
- ❌ Error: `ReferenceError: File is not defined`

---

## Root Cause

**Error Stack Trace:**
```
ReferenceError: File is not defined
    at undici/lib/web/webidl/index.js:531:48
```

**Issue:** Railway was running **Node.js 18**, but the `undici` package (used by axios and other HTTP clients) requires **Node.js 20+** because it uses the global `File` object which was added in Node 20.

**Local System:** Running Node.js 22 ✅
**Railway:** Running Node.js 18 ❌

---

## Solution

### 1. Updated `backend/package.json`
```json
"engines": {
  "node": ">=20.0.0"  // Changed from >=18.0.0
}
```

### 2. Added `.node-version` file
```
20
```

This explicitly tells Railway to use Node 20 for deployment.

---

## Result

✅ **All services now loaded: 9/9**

**Before:**
- taskQueue: ✅
- orchestrator: ✅
- queueWorker: ❌ **false**
- partnerManager: ✅
- automationScheduler: ❌ **false**
- matchmakingService: ✅
- emailService: ✅
- empireAgiBrain: ✅
- appointmentMonitor: ✅
- **Total: 7/9**

**After:**
- taskQueue: ✅
- orchestrator: ✅
- queueWorker: ✅ **true**
- partnerManager: ✅
- automationScheduler: ✅ **true**
- matchmakingService: ✅
- emailService: ✅
- empireAgiBrain: ✅
- appointmentMonitor: ✅
- **Total: 9/9 🎉**

---

## Testing

### Manual Lead Generation Endpoint
```bash
curl -X POST https://web-production-486cb.up.railway.app/api/automation/generate-leads
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 21 new leads",
  "opportunities": [...]
}
```

### Health Check
```bash
curl https://web-production-486cb.up.railway.app/health
```

**Response:**
```json
{
  "status": "healthy",
  "servicesLoaded": "9/9",
  "services": {
    "automationScheduler": true,
    "queueWorker": true,
    ...
  }
}
```

---

## Files Changed

1. `backend/package.json` - Updated Node.js engine requirement
2. `.node-version` - Added Node version specification for Railway

## Commits

- `3fed914` - Fix Node.js version requirement for undici compatibility
- `99329f4` - Add .node-version file for Railway deployment

---

## Key Learnings

1. **Always check Node.js version compatibility** when using modern npm packages
2. **The `File` global** was added in Node.js 20.0.0
3. **Railway respects both** `package.json` engines field and `.node-version` file
4. **`undici` package** (used internally by axios, node-fetch, etc.) requires Node 20+
5. **Error messages can be misleading** - "File is not defined" could mean Node version incompatibility

---

## Status: Production Ready ✅

All systems operational on Railway with Node.js 20.
