// Version checking and update management for ohh
class VersionManager {
    constructor() {
        this.currentVersion = '1.0.0';
        this.checkInterval = 3600000; // Check every hour
        this.notificationShown = false;
    }

    async init() {
        // Check for updates on load
        await this.checkForUpdates();
        
        // Check periodically
        setInterval(() => this.checkForUpdates(), this.checkInterval);
        
        // Listen for storage changes (cross-tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'ohhLatestVersion') {
                this.handleCrossTabUpdate(e.newValue);
            }
        });
    }

    async checkForUpdates() {
        try {
            const response = await fetch('./version.json?t=' + Date.now());
            const versionData = await response.json();
            const latestVersion = versionData.version;

            // Store in localStorage for cross-tab sync
            localStorage.setItem('ohhLatestVersion', latestVersion);

            if (this.isNewerVersion(latestVersion, this.currentVersion)) {
                this.showUpdateNotification(latestVersion, versionData);
            }
        } catch (error) {
            console.debug('Version check failed:', error);
        }
    }

    isNewerVersion(newVersion, currentVersion) {
        const parse = (v) => v.split('.').map(Number);
        const [newMajor, newMinor, newPatch] = parse(newVersion);
        const [curMajor, curMinor, curPatch] = parse(currentVersion);

        if (newMajor !== curMajor) return newMajor > curMajor;
        if (newMinor !== curMinor) return newMinor > curMinor;
        return newPatch > curPatch;
    }

    showUpdateNotification(version, versionData) {
        if (this.notificationShown) return;
        this.notificationShown = true;

        // Create notification container if doesn't exist
        let container = document.getElementById('updateNotification');
        if (!container) {
            container = document.createElement('div');
            container.id = 'updateNotification';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #4f93ff 0%, #7cb9ff 100%);
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(79, 147, 255, 0.3);
                z-index: 9999;
                max-width: 400px;
                font-family: 'Inter', sans-serif;
                animation: slideUp 0.3s ease;
            `;

            const message = document.createElement('div');
            message.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 8px;">
                    ✨ New version available (v${version})
                </div>
                <div style="font-size: 13px; margin-bottom: 12px; opacity: 0.9;">
                    ${versionData.releaseNotes || 'Check what\'s new'}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="location.reload()" style="
                        background: rgba(255,255,255,0.3);
                        border: none;
                        color: white;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                    ">Update Now</button>
                    <button onclick="document.getElementById('updateNotification').style.display='none'" style="
                        background: transparent;
                        border: 1px solid rgba(255,255,255,0.5);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                    ">Later</button>
                </div>
            `;
            container.appendChild(message);
            document.body.appendChild(container);
        }
    }

    handleCrossTabUpdate(latestVersion) {
        // If another tab detected update, notify this tab too
        if (this.isNewerVersion(latestVersion, this.currentVersion)) {
            this.showUpdateNotification(latestVersion, {});
        }
    }

    getRolloutPercentage() {
        // Determine if user gets new version based on rollout %
        const stored = localStorage.getItem('ohhUserRollout');
        if (!stored) {
            const rollout = Math.random() * 100;
            localStorage.setItem('ohhUserRollout', rollout);
            return rollout;
        }
        return parseFloat(stored);
    }

    getAppVersion() {
        return this.currentVersion;
    }

    setAppVersion(version) {
        this.currentVersion = version;
    }
}

// Export for use
const versionManager = new VersionManager();
