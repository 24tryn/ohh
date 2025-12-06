# 🚀 Deployment Quick Reference Card

## One-Page Cheat Sheet

### Initial Setup (One Time)
```bash
npm install
npm run build
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

---

### Deploy New Version

#### Step 1: Create & Tag Release
```bash
git checkout -b release/v1.0.1
# ... make changes ...
git commit -m "v1.0.1: Fix UI bug"
git tag -a v1.0.1 -m "Patch release"
git push origin v1.0.1
```

#### Step 2: Wait for CI/CD
- GitHub Actions automatically deploys to staging
- Check GitHub Actions tab for status
- Wait for green checkmarks ✅

#### Step 3: Validate Staging (24h)
- Test all features
- Check performance
- Monitor error logs
- Get approval

#### Step 4: Canary Rollout
```bash
# Starts at 0% (internal only)
# Hour 2: Go to 10%
./increase-rollout.sh 10

# Hour 6: Go to 25%
./increase-rollout.sh 25

# Hour 14: Go to 50%
./increase-rollout.sh 50

# Hour 22: Go to 100%
./increase-rollout.sh 100
```

---

### Emergency Rollback
```bash
# Instant revert to previous version
./rollback.sh 1.0.0
```
- Sets rollout to 0%
- Restores files
- Takes ~2 minutes

---

### Monitor Metrics at Each Stage
| Metric | Target | Alert |
|--------|--------|-------|
| Error Rate | < 0.1% | > 1% |
| Response | < 500ms | > 2s |
| Users OK | > 95% | < 90% |

**If any alert → ROLLBACK immediately**

---

### Directory Structure
```
ohh/
├── index.html              # Main app
├── ohh.jsx                 # Logic
├── version.json            # Version info
├── version-manager.js      # Update notifications
├── deploy.sh              # Deploy script
├── increase-rollout.sh    # Canary release
├── rollback.sh            # Emergency revert
├── backups/               # Version backups
│  ├── v1.0.0-timestamp/
│  └── v1.0.1-timestamp/
└── releases/              # Release notes
```

---

### Files at a Glance

| File | Purpose | Command |
|------|---------|---------|
| `deploy.sh` | Full deployment | `./deploy.sh production patch` |
| `increase-rollout.sh` | Gradual release | `./increase-rollout.sh 50` |
| `rollback.sh` | Go back | `./rollback.sh 1.0.0` |
| `version.json` | Version metadata | View with `cat version.json` |
| `.env` | Rollout % | Check with `cat .env` |

---

### Version Numbering
```
1.0.0 = Major.Minor.Patch

Patch (1.0.1):  Bug fixes
./deploy.sh production patch

Minor (1.1.0):  New features
./deploy.sh production minor

Major (2.0.0):  Breaking changes
./deploy.sh production major
```

---

### Timeline
```
Day 1
10:00 AM → Deploy to staging
10:05 AM → Tests run
10:10 AM → Deploy to production (0%)

Day 2  
10:00 AM → +10% rollout
          → Monitor 2-4h
02:00 PM → +25% rollout
          → Monitor 4-8h
10:00 PM → +50% rollout
          → Monitor 8-24h

Day 3
10:00 AM → +100% rollout
          → Release complete!
```

---

### Troubleshooting

**Deployment stuck?**
```bash
# Check status
cat rollout.log
cat .env | grep ROLLOUT
```

**Need to rollback?**
```bash
# List previous versions
ls backups/

# Rollback to version
./rollback.sh 1.0.0
```

**Update failed?**
```bash
# Restore manually
cp backups/v1.0.0-*/index.html ./
```

---

### Success Criteria ✅
- ✓ All tests pass
- ✓ Staging validated 24h+
- ✓ 10% rollout: no errors
- ✓ 25% rollout: no errors
- ✓ 50% rollout: no errors
- ✓ 100% rollout: stable
- ✓ Monitor 48h post-release

---

### Risk Mitigation
| Risk | Mitigation |
|------|-----------|
| Bug breaks app | Start at 0%, canary rollout |
| Many users affected | Rollback in 2 minutes |
| Need previous version | Backups kept 30+ days |
| Unclear what changed | Release notes in `releases/` |

---

### Emergency Contacts
- **Tech Lead:** Fix and redeploy
- **DevOps:** Run rollback.sh
- **Team:** Notify via Slack/Email

---

### Remember
```
Deploy slowly.
Monitor constantly.
Rollback immediately if issues.
Celebrate when complete! 🎉
```

---

**Print this card and keep at desk!**

Last Updated: 2025-12-06
