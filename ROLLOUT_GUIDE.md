# 🚀 Deployment Guide for ohh

## Quick Start

### First Deployment
```bash
# 1. Prepare
npm run test
npm run build

# 2. Deploy to staging
./deploy.sh staging patch

# 3. Validate (24-48 hours)
# Monitor staging for issues

# 4. Deploy to production
./deploy.sh production patch
# ⚠️ Starts at 0% rollout (safe)

# 5. Gradually increase rollout
./increase-rollout.sh 10    # After 2-4 hours
./increase-rollout.sh 25    # After another 4 hours
./increase-rollout.sh 50    # After another 8 hours
./increase-rollout.sh 100   # When confident (24+ hours)
```

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│  GitHub / Source Control                        │
│  (Push to main or tag v1.0.0)                   │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  CI/CD Pipeline (.github/workflows/deploy.yml)  │
│  - Run tests                                    │
│  - Build artifacts                              │
│  - Create backups                               │
└──────────────┬──────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
  STAGING         PRODUCTION
   (100%)          (0% → 100%)
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
      10%           25%            50%
     Users        Users          Users
   (Canary)    (Expanded)      (Validate)
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
                  100% Users
               (Full Production)
```

---

## 🎯 Step-by-Step Deployment

### Step 1: Create a Release Branch
```bash
git checkout -b release/v1.0.1
# Make changes, commit, push
```

### Step 2: Tag the Release
```bash
git tag -a v1.0.1 -m "Release version 1.0.1"
git push origin v1.0.1
```

**Triggers:** GitHub Actions automatically starts deployment

### Step 3: Monitoring (First Stage - 0%)
```bash
# GitHub Actions deploys to production at 0% rollout
# Check the deployment status
```

**What to check:**
- ✅ No errors in console
- ✅ All features accessible
- ✅ Staging environment stable

**Duration:** 1-2 hours

### Step 4: Canary Stage 1 (0% → 10%)
```bash
# After 2-4 hours, if stable:
./increase-rollout.sh 10
```

**Monitoring:**
- Error rates < 0.1%
- Response time < 500ms
- User feedback positive

**Decision:** Continue to 25% or Rollback

### Step 5: Canary Stage 2 (10% → 25%)
```bash
./increase-rollout.sh 25
```

**Monitoring:** Same as above, 4-8 hours

### Step 6: Canary Stage 3 (25% → 50%)
```bash
./increase-rollout.sh 50
```

**Duration:** 8-24 hours
**Confidence:** High - half your users now running new version

### Step 7: Full Release (50% → 100%)
```bash
./increase-rollout.sh 100
```

**Announcement:** Version now fully in production

---

## 🚨 Emergency Rollback

If issues occur **at any stage**:

```bash
# Immediate action
./rollback.sh 1.0.0
```

**This instantly:**
1. Reverts code to previous version
2. Sets rollout to 0% (safe state)
3. Logs the rollback event
4. Sends alerts

**Execution time:** <2 minutes

---

## 📁 Files and Their Purpose

| File | Purpose |
|------|---------|
| `version.json` | Version metadata & feature flags |
| `.env` | Environment variables & rollout % |
| `version-manager.js` | Browser-side update notifications |
| `deploy.sh` | Main deployment script |
| `increase-rollout.sh` | Gradual rollout control |
| `rollback.sh` | Emergency revert script |
| `.github/workflows/deploy.yml` | CI/CD automation |
| `DEPLOYMENT.md` | This guide |
| `backups/` | Previous version backups |
| `releases/` | Release notes history |
| `rollout.log` | Deployment history log |

---

## 🔄 Workflow Comparison

### Without Rollout (High Risk ❌)
```
Deploy → All users get new version immediately
         ↓
         If bug exists: 100% users affected
         ↓
         Rollback causes large disruption
```

### With Canary Rollout (Safe ✅)
```
Deploy → 0% (validation)
  ↓
10% (canary test) → Monitor
  ↓
25% (expand test) → Monitor
  ↓
50% (validate at scale) → Monitor
  ↓
100% (full release) → Minimal risk
```

---

## 📊 Monitoring During Rollout

### Key Metrics to Track

**1. Error Rate**
```
Target: < 0.1%
Alert: > 1%
Action: ROLLBACK
```

**2. Response Time**
```
Target: < 500ms
Alert: > 2s
Action: ROLLBACK
```

**3. User Engagement**
```
Target: Maintain or improve
Alert: Significant drop
Action: ROLLBACK
```

**4. Browser Console**
```
Target: No critical errors
Alert: JS errors, API failures
Action: ROLLBACK
```

---

## 💾 Backup & Recovery

### Automatic Backups
- Created before every deployment
- Located in `backups/v{version}-{timestamp}/`
- Contains: index.html, ohh.jsx, version.json

### Manual Backup
```bash
mkdir -p backups/manual
cp index.html ohh.jsx version.json backups/manual/
```

### Restore from Backup
```bash
# Restore specific version
./rollback.sh 1.0.0

# Or manually
cp backups/v1.0.0-*/index.html index.html
cp backups/v1.0.0-*/ohh.jsx ohh.jsx
cp backups/v1.0.0-*/version.json version.json
```

---

## 🔐 Security Practices

### Pre-Deployment
- ☐ Code review completed
- ☐ Security scan passed
- ☐ All tests passing
- ☐ No vulnerabilities found

### During Rollout
- ☐ Monitor error logs
- ☐ Check for suspicious activity
- ☐ Validate user data integrity
- ☐ Performance metrics stable

### Post-Deployment
- ☐ 48-hour observation period
- ☐ Security headers verified
- ☐ Rate limiting active
- ☐ Logs archived

---

## 📝 Release Notes Template

```markdown
# Release v1.0.1
**Date:** 2025-12-07
**Status:** In Progress

## 🎯 Rollout Progress
- [x] Staging validation
- [ ] Production 0%
- [ ] Production 10%
- [ ] Production 25%
- [ ] Production 50%
- [ ] Production 100%

## ✨ New Features
- Feature 1
- Feature 2

## 🐛 Bug Fixes
- Fixed issue 1
- Fixed issue 2

## 📊 Performance
- Improved load time by 15%
- Reduced bundle size by 2%

## ⚠️ Known Issues
- None

## 🔄 Rollback Command
./rollback.sh 1.0.0
```

---

## 🎓 Common Questions

### Q: How long should each rollout stage take?
**A:** 
- 0%: 1-2 hours (validation)
- 10%: 2-4 hours (canary)
- 25%: 4-8 hours (expanded)
- 50%: 8-24 hours (validation at scale)
- 100%: Full release

### Q: What if I find a bug during canary?
**A:** Run `./rollback.sh 1.0.0` immediately. No user impact beyond the tested percentage.

### Q: Can I skip stages?
**A:** Not recommended. Each stage catches different issues. However, internal tools can move faster.

### Q: How do users get the update?
**A:**
- Browser cache: CSS/JS bust with version-manager.js
- Manual refresh: Clears old files
- Service Worker: Can force update
- Update notification: Shows in bottom-right

### Q: How long do I keep backups?
**A:** 30+ days recommended. Older versions unlikely needed.

---

## 📞 Support & Troubleshooting

### Deployment Stuck?
```bash
# Check logs
tail -f deployment-*.log

# Check rollout status
cat .env | grep ROLLOUT

# View deployment history
cat rollout.log
```

### Rollback Failed?
```bash
# Manual restore
ls backups/
cp backups/v1.0.0-*/index.html index.html
# Verify files
diff index.html backups/v1.0.0-*/index.html
```

### CI/CD Issues?
- Check `.github/workflows/deploy.yml`
- View GitHub Actions logs
- Verify secrets configured
- Test scripts locally first

### Need Help?
- Email: oohapps9@gmail.com
- Documentation: DEPLOYMENT.md
- Issues: GitHub Issues tab

---

## 🏆 Best Practices

✅ **DO:**
- Test thoroughly on staging first
- Use canary rollout even for small changes
- Monitor metrics at each stage
- Keep detailed release notes
- Maintain backups of all versions
- Have rollback ready

❌ **DON'T:**
- Deploy during peak hours (if possible)
- Skip stages in canary rollout
- Deploy without backups
- Release without testing
- Ignore error metrics
- Deploy and disappear

---

## 📈 Success Metrics

Your deployment is successful when:
- ✅ 0% errors in production
- ✅ All features working
- ✅ User feedback positive
- ✅ Performance metrics stable
- ✅ No rollbacks needed
- ✅ Full rollout completed

---

**Version:** 1.0.0  
**Last Updated:** 2025-12-06  
**Maintained by:** ohh team
