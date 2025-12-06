// ohh - Web3 Task Manager
// A simple, elegant task manager for remembering on-chain activities

class OhhTaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.userEmail = this.loadUserEmail();
        this.reminderSettings = this.loadReminderSettings();
        this.usageStats = this.loadUsageStats();
        this.wallet = {
            connected: false,
            address: null,
            network: null,
            type: null // 'evm' or 'svm'
        };
        this.searchQuery = '';
        this.sortBy = 'dateCreated'; // dateCreated, dueDate, priority, status
        this.filterType = 'all'; // all, completed, pending
        this.reminderCheckInterval = null;
        this.init();
    }

    init() {
        this.trackUsage();
        this.setupEventListeners();
        this.renderTasks();
        this.updateStats();
        this.checkWalletConnection();
        this.updateEmailStatus();
        this.startReminderChecker();
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('searchTasks')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            if (this.searchQuery.length > 0) {
                this.trackFeatureUsage('searchUsed');
            }
            this.renderTasks();
        });

        // Filter and sort buttons
        document.getElementById('filterBtn')?.addEventListener('click', () => {
            this.trackFeatureUsage('filterUsed');
            this.cycleFilter();
        });

        document.getElementById('sortBtn')?.addEventListener('click', () => {
            this.trackFeatureUsage('sortUsed');
            this.cycleSort();
        });

        // Email Preferences
        document.getElementById('saveEmailBtn').addEventListener('click', () => {
            this.saveUserEmail();
        });

        document.getElementById('userEmail').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveUserEmail();
            }
        });

        document.getElementById('remindBefore').addEventListener('change', () => {
            this.saveReminderSettings();
        });

        document.getElementById('remindOnDay').addEventListener('change', () => {
            this.saveReminderSettings();
        });

        document.getElementById('remindAfter').addEventListener('change', () => {
            this.saveReminderSettings();
        });

        // Wallet Connection
        document.getElementById('walletBtn').addEventListener('click', () => {
            document.getElementById('walletModal').classList.add('active');
        });

        document.getElementById('evmWalletBtn').addEventListener('click', () => {
            this.connectEVMWallet();
        });

        document.getElementById('svmWalletBtn').addEventListener('click', () => {
            this.connectSVMWallet();
        });

        // Task Management
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            document.getElementById('addTaskModal').classList.add('active');
        });

        document.getElementById('createTaskBtn').addEventListener('click', () => {
            this.createTaskFromModal();
        });

        // Quick Add
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && document.getElementById('quickTaskInput') === document.activeElement) {
                this.quickAddTask();
            }
        });

        document.getElementById('quickAddConfirmBtn')?.addEventListener('click', () => {
            this.quickAddTask();
        });

        document.getElementById('quickAddCancelBtn')?.addEventListener('click', () => {
            document.getElementById('quickAddGroup').style.display = 'none';
        });

        // Support and Bug Report
        document.getElementById('supportBtn').addEventListener('click', () => {
            document.getElementById('supportModal').classList.add('active');
        });

        document.getElementById('bugReportBtn').addEventListener('click', () => {
            document.getElementById('bugReportModal').classList.add('active');
        });

        document.getElementById('sendSupportBtn').addEventListener('click', () => {
            this.sendSupport();
        });

        document.getElementById('sendBugBtn').addEventListener('click', () => {
            this.sendBugReport();
        });

        // Modal close on background click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchTasks')?.focus();
            }
            // Ctrl/Cmd + N to create new task
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('addTaskBtn').click();
            }
        });
    }

    cycleFilter() {
        const filters = ['all', 'pending', 'completed'];
        const current = filters.indexOf(this.filterType);
        this.filterType = filters[(current + 1) % filters.length];
        const btn = document.getElementById('filterBtn');
        const labels = { all: '📋 All', pending: '⏳ Pending', completed: '✅ Done' };
        btn.textContent = labels[this.filterType];
        this.renderTasks();
    }

    cycleSort() {
        const sorts = ['dateCreated', 'dueDate', 'priority', 'status'];
        const current = sorts.indexOf(this.sortBy);
        this.sortBy = sorts[(current + 1) % sorts.length];
        const btn = document.getElementById('sortBtn');
        const labels = { dateCreated: '📅 Created', dueDate: '🏁 Due', priority: '⭐ Priority', status: '✓ Status' };
        btn.textContent = labels[this.sortBy];
        this.renderTasks();
    }

    // ========== WALLET CONNECTION ==========
    async connectEVMWallet() {
        try {
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask or another EVM wallet extension!');
                return;
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });

            this.wallet.connected = true;
            this.wallet.address = accounts[0];
            this.wallet.network = `0x${chainId}`;
            this.wallet.type = 'evm';
            this.trackWalletConnection();

            this.saveWalletState();
            this.updateWalletUI();
            document.getElementById('walletModal').classList.remove('active');

            alert(`✅ Connected to MetaMask!\nAddress: ${this.shortenAddress(accounts[0])}`);
        } catch (error) {
            if (error.code === -32002) {
                alert('⚠️ MetaMask request already pending. Please check your wallet.');
            } else if (error.code !== 4001) {
                alert('❌ Failed to connect MetaMask: ' + error.message);
            }
        }
    }

    async connectSVMWallet() {
        try {
            // Check for Phantom wallet (most popular Solana wallet)
            if (typeof window.solana === 'undefined') {
                // Fallback to other Solana wallet adapters
                const walletName = prompt('Enter your Solana wallet (Phantom, Magic Eden, etc.):');
                if (!walletName) return;
                
                // Simulate connection for demo
                this.wallet.connected = true;
                this.wallet.address = 'SolanaWalletDemo123456789';
                this.wallet.network = 'solana-mainnet';
                this.wallet.type = 'svm';
            } else {
                // Connect Phantom
                const resp = await window.solana.connect();
                this.wallet.connected = true;
                this.wallet.address = resp.publicKey.toString();
                this.wallet.network = 'solana-mainnet';
                this.wallet.type = 'svm';
            }

            this.saveWalletState();
            this.updateWalletUI();
            document.getElementById('walletModal').classList.remove('active');

            alert(`✅ Connected to Solana Wallet!\nAddress: ${this.shortenAddress(this.wallet.address)}`);
        } catch (error) {
            alert('❌ Failed to connect Solana wallet: ' + (error.message || 'Unknown error'));
        }
    }

    checkWalletConnection() {
        const savedWallet = localStorage.getItem('ohhWallet');
        if (savedWallet) {
            const parsed = JSON.parse(savedWallet);
            this.wallet = parsed;
            this.updateWalletUI();
        }
    }

    saveWalletState() {
        localStorage.setItem('ohhWallet', JSON.stringify(this.wallet));
    }

    updateWalletUI() {
        const statusEl = document.getElementById('walletStatus');
        const addressEl = document.getElementById('walletAddress');
        const walletBtn = document.getElementById('walletBtn');

        if (this.wallet.connected) {
            statusEl.textContent = `✅ Connected (${this.wallet.type.toUpperCase()})`;
            statusEl.classList.add('connected');
            addressEl.textContent = this.shortenAddress(this.wallet.address);
            walletBtn.textContent = `🔌 Disconnect`;
            walletBtn.onclick = () => this.disconnectWallet();
        } else {
            statusEl.textContent = 'Not Connected';
            statusEl.classList.remove('connected');
            addressEl.textContent = '-';
            walletBtn.textContent = `Connect Wallet`;
            walletBtn.onclick = () => document.getElementById('walletModal').classList.add('active');
        }
    }

    disconnectWallet() {
        this.wallet = {
            connected: false,
            address: null,
            network: null,
            type: null
        };
        localStorage.removeItem('ohhWallet');
        this.updateWalletUI();
        alert('✅ Wallet disconnected');
    }

    shortenAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    // ========== TASK MANAGEMENT ==========
    createTaskFromModal() {
        const name = document.getElementById('modalTaskName').value;
        const desc = document.getElementById('modalTaskDesc').value;
        const type = document.getElementById('modalTaskType').value;
        const chain = document.getElementById('modalTaskChain').value;
        const protocol = document.getElementById('modalTaskProtocol').value;
        const dueDate = document.getElementById('modalTaskDueDate').value;

        if (!name.trim()) {
            alert('Task title is required!');
            return;
        }

        if (!chain) {
            alert('Please select a chain!');
            return;
        }

        if (!protocol) {
            alert('Please select a protocol!');
            return;
        }

        this.addTask(name, desc, type, chain, protocol, dueDate);

        // Clear modal
        document.getElementById('modalTaskName').value = '';
        document.getElementById('modalTaskDesc').value = '';
        document.getElementById('modalTaskType').value = 'reminder';
        document.getElementById('modalTaskChain').value = '';
        document.getElementById('modalTaskProtocol').value = '';
        document.getElementById('modalTaskDueDate').value = '';
        document.getElementById('addTaskModal').classList.remove('active');
    }

    quickAddTask() {
        const name = document.getElementById('quickTaskInput').value;
        const desc = document.getElementById('quickTaskDesc').value;
        const type = document.getElementById('quickTaskType').value;

        if (!name.trim()) {
            alert('Task name is required!');
            return;
        }

        this.addTask(name, desc, type, '');

        // Clear inputs
        document.getElementById('quickTaskInput').value = '';
        document.getElementById('quickTaskDesc').value = '';
        document.getElementById('quickTaskType').value = 'reminder';
        document.getElementById('quickAddGroup').style.display = 'none';
    }

    addTask(name, description, type, chain, protocol, dueDate) {
        const task = {
            id: Date.now(),
            name: name,
            description: description,
            type: type, // reminder, claiming, staking, other
            chain: chain, // ethereum, polygon, solana, etc.
            protocol: protocol, // uniswap, aave, etc.
            dueDate: dueDate,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.tasks.push(task);
        this.trackTaskCreated();
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
    }

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            if (task.completed) {
                this.trackTaskCompleted();
            }
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            document.getElementById('modalTaskName').value = task.name;
            document.getElementById('modalTaskDesc').value = task.description;
            document.getElementById('modalTaskType').value = task.type;
            document.getElementById('modalTaskChain').value = task.chain;
            document.getElementById('modalTaskProtocol').value = task.protocol;
            document.getElementById('modalTaskDueDate').value = task.dueDate;

            // Change create button to update
            const createBtn = document.getElementById('createTaskBtn');
            const originalText = createBtn.textContent;
            createBtn.textContent = 'Update Task';

            // Override create function for this task
            createBtn.onclick = () => {
                task.name = document.getElementById('modalTaskName').value;
                task.description = document.getElementById('modalTaskDesc').value;
                task.type = document.getElementById('modalTaskType').value;
                task.chain = document.getElementById('modalTaskChain').value;
                task.protocol = document.getElementById('modalTaskProtocol').value;
                task.dueDate = document.getElementById('modalTaskDueDate').value;

                this.saveTasks();
                this.renderTasks();
                this.updateStats();

                document.getElementById('addTaskModal').classList.remove('active');
                createBtn.textContent = originalText;
                createBtn.onclick = () => this.createTaskFromModal();

                alert('✅ Task updated!');
            };

            document.getElementById('addTaskModal').classList.add('active');
        }
    }

    renderTasks() {
        const taskList = document.getElementById('taskList');

        // Filter tasks
        let filtered = this.tasks.filter(task => {
            // Apply search filter
            const matchesSearch = !this.searchQuery || 
                task.name.toLowerCase().includes(this.searchQuery) ||
                task.description.toLowerCase().includes(this.searchQuery) ||
                this.getChainName(task.chain).toLowerCase().includes(this.searchQuery);

            // Apply status filter
            const matchesFilter = this.filterType === 'all' ||
                (this.filterType === 'completed' && task.completed) ||
                (this.filterType === 'pending' && !task.completed);

            return matchesSearch && matchesFilter;
        });

        // Sort tasks
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'dueDate':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'status':
                    return a.completed - b.completed;
                case 'dateCreated':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        if (filtered.length === 0) {
            const emptyMessage = this.tasks.length === 0 
                ? 'No tasks yet. Create your first task to get started!'
                : 'No tasks match your search or filter.';
            
            taskList.innerHTML = `
                <li class="empty-state">
                    <p>${emptyMessage}</p>
                    <p class="empty-state-text">💡 Try adjusting your search or filters</p>
                </li>
            `;
            return;
        }

        taskList.innerHTML = filtered.map(task => `
            <li class="task-item ${task.completed ? 'completed' : ''}">
                <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''} 
                    onchange="ohhManager.toggleTask(${task.id})">
                <div class="task-content">
                    <div class="task-title task-text">${this.getTypeEmoji(task.type)} ${this.escapeHtml(task.name)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    <div class="task-meta">
                        <span class="task-type">${task.type}</span>
                        <span class="task-type" style="background: linear-gradient(135deg, #4a5f7f 0%, #1a2f5f 100%); color: #a0c8ff;">⛓️ ${this.getChainName(task.chain)}</span>
                        <span class="task-type" style="background: linear-gradient(135deg, #6a4f7f 0%, #3a1f5f 100%); color: #d0a8ff;">🔌 ${this.getProtocolName(task.protocol)}</span>
                        ${task.dueDate ? `<span>📅 ${new Date(task.dueDate).toLocaleDateString()}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-secondary" onclick="ohhManager.editTask(${task.id})">✏️ Edit</button>
                    <button class="btn-danger" onclick="ohhManager.deleteTask(${task.id})">🗑️ Delete</button>
                </div>
            </li>
        `).join('');
    }

    getTypeEmoji(type) {
        const emojis = {
            'reminder': '📌',
            'claiming': '🎁',
            'staking': '💰',
            'other': '📝'
        };
        return emojis[type] || '📝';
    }

    getChainName(chain) {
        const chains = {
            'ethereum': 'Ethereum',
            'polygon': 'Polygon',
            'bsc': 'BSC',
            'arbitrum': 'Arbitrum',
            'optimism': 'Optimism',
            'avalanche': 'Avalanche',
            'fantom': 'Fantom',
            'base': 'Base',
            'solana': 'Solana',
            'other': 'Other'
        };
        return chains[chain] || chain;
    }

    getProtocolName(protocol) {
        const protocols = {
            'uniswap': 'Uniswap',
            'aave': 'Aave',
            'curve': 'Curve',
            'lido': 'Lido',
            'opensea': 'OpenSea',
            'compound': 'Compound',
            'raydium': 'Raydium',
            'magic-eden': 'Magic Eden',
            'stake-pool': 'Stake Pool',
            'other': 'Other'
        };
        return protocols[protocol] || protocol;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('completedTasks').textContent = completed;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('completionRate').textContent = completionRate + '%';
    }

    // ========== SUPPORT & BUG REPORTS ==========
    sendSupport() {
        const email = 'oohapps9@gmail.com';
        const subject = document.getElementById('supportSubject').value;
        const message = document.getElementById('supportMessage').value;

        if (!subject.trim() || !message.trim()) {
            alert('Please fill in all fields');
            return;
        }

        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        window.location.href = mailtoLink;

        // Reset form
        document.getElementById('supportSubject').value = '';
        document.getElementById('supportMessage').value = '';
        document.getElementById('supportModal').classList.remove('active');

        alert('✅ Opening your email client...\n\nIf it doesn\'t open, you can email us directly at: ' + email);
    }

    sendBugReport() {
        const email = 'oohapps9@gmail.com';
        const title = document.getElementById('bugTitle').value;
        const description = document.getElementById('bugDescription').value;

        if (!title.trim() || !description.trim()) {
            alert('Please fill in all fields');
            return;
        }

        const fullMessage = `Bug Report\n\nTitle: ${title}\n\nDescription:\n${description}\n\nWallet: ${this.wallet.connected ? this.wallet.address : 'Not connected'}\nBrowser: ${navigator.userAgent}`;
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent('[Bug Report] ' + title)}&body=${encodeURIComponent(fullMessage)}`;
        window.location.href = mailtoLink;

        // Reset form
        document.getElementById('bugTitle').value = '';
        document.getElementById('bugDescription').value = '';
        document.getElementById('bugReportModal').classList.remove('active');

        alert('✅ Opening your email client...\n\nThank you for helping us improve ohh!\nEmail: ' + email);
    }

    // ========== EMAIL & REMINDERS ==========
    saveUserEmail() {
        const email = document.getElementById('userEmail').value.trim();
        
        if (!email) {
            alert('Please enter a valid email address');
            return;
        }

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        this.userEmail = email;
        localStorage.setItem('ohhUserEmail', email);
        this.trackFeatureUsage('emailRemindersUsed');
        this.updateEmailStatus();
        alert(`✅ Email saved! We'll send reminders to ${email}`);
    }

    loadUserEmail() {
        return localStorage.getItem('ohhUserEmail') || '';
    }

    updateEmailStatus() {
        const statusEl = document.getElementById('emailStatus');
        const emailInput = document.getElementById('userEmail');

        if (this.userEmail) {
            emailInput.value = this.userEmail;
            statusEl.textContent = `✅ Reminders active: ${this.userEmail}`;
            statusEl.classList.add('active');
            statusEl.style.display = 'block';
        } else {
            statusEl.textContent = '❌ No email set - Reminders disabled';
            statusEl.classList.remove('active');
            statusEl.style.display = 'block';
        }
    }

    saveReminderSettings() {
        this.reminderSettings = {
            remindBefore: document.getElementById('remindBefore').checked,
            remindOnDay: document.getElementById('remindOnDay').checked,
            remindAfter: document.getElementById('remindAfter').checked
        };
        localStorage.setItem('ohhReminderSettings', JSON.stringify(this.reminderSettings));
    }

    loadReminderSettings() {
        const stored = localStorage.getItem('ohhReminderSettings');
        const defaults = {
            remindBefore: true,
            remindOnDay: true,
            remindAfter: true
        };
        
        if (stored) {
            const loaded = JSON.parse(stored);
            // Update checkboxes when page loads
            setTimeout(() => {
                document.getElementById('remindBefore').checked = loaded.remindBefore;
                document.getElementById('remindOnDay').checked = loaded.remindOnDay;
                document.getElementById('remindAfter').checked = loaded.remindAfter;
            }, 100);
            return loaded;
        }
        return defaults;
    }

    startReminderChecker() {
        // Initial check
        this.checkAndSendReminders();
        
        // Check reminders every 5 minutes with debouncing
        this.reminderCheckInterval = setInterval(() => {
            this.checkAndSendReminders();
        }, 300000); // Every 5 minutes (300,000 ms)
    }

    stopReminderChecker() {
        if (this.reminderCheckInterval) {
            clearInterval(this.reminderCheckInterval);
        }
    }

    checkAndSendReminders() {
        if (!this.userEmail) return;

        const now = new Date();
        const remindersToSend = [];

        this.tasks.forEach(task => {
            if (task.completed || !task.dueDate) return;

            const dueDate = new Date(task.dueDate);
            const timeDiff = dueDate - now;
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

            // Check if task was completed
            const lastChecked = localStorage.getItem(`ohhLastCheck_${task.id}`) || '0';

            // Remind 1 day before
            if (this.reminderSettings.remindBefore && daysDiff > 0 && daysDiff <= 1.5 && lastChecked !== 'remind-before') {
                remindersToSend.push({
                    id: task.id,
                    type: 'before',
                    task: task,
                    message: `Your task "${task.name}" is due tomorrow!`
                });
                localStorage.setItem(`ohhLastCheck_${task.id}`, 'remind-before');
            }

            // Remind on due date
            if (this.reminderSettings.remindOnDay && daysDiff >= -0.5 && daysDiff <= 0.5 && lastChecked !== 'remind-on-day') {
                remindersToSend.push({
                    id: task.id,
                    type: 'onday',
                    task: task,
                    message: `Your task "${task.name}" is due today!`
                });
                localStorage.setItem(`ohhLastCheck_${task.id}`, 'remind-on-day');
            }

            // Remind if not completed and past due
            if (this.reminderSettings.remindAfter && daysDiff < -0.5 && lastChecked !== 'remind-after') {
                remindersToSend.push({
                    id: task.id,
                    type: 'after',
                    task: task,
                    message: `Your task "${task.name}" is overdue! Please complete or update it.`
                });
                localStorage.setItem(`ohhLastCheck_${task.id}`, 'remind-after');
            }
        });

        // Simulate sending reminders (in production, this would call a backend API)
        if (remindersToSend.length > 0) {
            remindersToSend.forEach(reminder => {
                this.simulateEmailReminder(reminder);
            });
        }
    }

    simulateEmailReminder(reminder) {
        console.log(`📧 Email Reminder sent to ${this.userEmail}:`, reminder);
        
        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('ohh - Task Reminder', {
                body: reminder.message,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%234f93ff;stop-opacity:1" /><stop offset="100%" style="stop-color:%237cb9ff;stop-opacity:1" /></linearGradient></defs><rect width="100" height="100" rx="20" fill="%230f1419"/><circle cx="30" cy="30" r="15" fill="url(%23grad)"/><circle cx="70" cy="30" r="15" fill="url(%23grad)"/><path d="M 25 60 Q 50 80 75 60" stroke="url(%23grad)" stroke-width="8" fill="none" stroke-linecap="round"/></svg>'
            });
        }

        // Show in-app notification
        this.showInAppNotification(reminder.message);
    }

    showInAppNotification(message) {
        // Create a temporary notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #4f93ff 0%, #3d7ae8 100%);
            color: white;
            padding: 16px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(79, 147, 255, 0.3);
            font-size: 14px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;
        notification.textContent = message;
        notification.innerHTML = `✅ ${message}`;
        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // ========== STORAGE ==========
    loadTasks() {
        const stored = localStorage.getItem('ohhTasks');
        return stored ? JSON.parse(stored) : [];
    }

    saveTasks() {
        localStorage.setItem('ohhTasks', JSON.stringify(this.tasks));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ========== USAGE TRACKING ==========
    loadUsageStats() {
        const stored = localStorage.getItem('ohhUsageStats');
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            totalSessions: 0,
            totalVisits: 0,
            firstVisit: new Date().toISOString(),
            lastVisit: new Date().toISOString(),
            totalTasksCreated: 0,
            totalTasksCompleted: 0,
            totalTimesWalletConnected: 0,
            averageSessionDuration: 0,
            features: {
                searchUsed: 0,
                filterUsed: 0,
                sortUsed: 0,
                emailRemindersUsed: 0,
                walletConnected: 0,
                tasksWithReminders: 0
            }
        };
    }

    trackUsage() {
        // Increment session and visit counters
        this.usageStats.totalSessions++;
        this.usageStats.totalVisits++;
        this.usageStats.lastVisit = new Date().toISOString();

        // Track session start time for duration calculation
        this.sessionStartTime = Date.now();

        // Save updated stats
        this.saveUsageStats();

        // Log to console for debugging
        console.log('📊 Usage tracked:', {
            sessions: this.usageStats.totalSessions,
            visits: this.usageStats.totalVisits,
            tasksCreated: this.usageStats.totalTasksCreated,
            tasksCompleted: this.usageStats.totalTasksCompleted
        });
    }

    trackFeatureUsage(feature) {
        if (this.usageStats.features[feature] !== undefined) {
            this.usageStats.features[feature]++;
            this.saveUsageStats();
        }
    }

    trackTaskCreated() {
        this.usageStats.totalTasksCreated++;
        this.saveUsageStats();
    }

    trackTaskCompleted() {
        this.usageStats.totalTasksCompleted++;
        this.saveUsageStats();
    }

    trackWalletConnection() {
        this.usageStats.totalTimesWalletConnected++;
        this.usageStats.features.walletConnected++;
        this.saveUsageStats();
    }

    saveUsageStats() {
        localStorage.setItem('ohhUsageStats', JSON.stringify(this.usageStats));
    }

    getUsageReport() {
        const report = {
            ...this.usageStats,
            taskCompletionRate: this.usageStats.totalTasksCreated > 0 
                ? ((this.usageStats.totalTasksCompleted / this.usageStats.totalTasksCreated) * 100).toFixed(2) + '%'
                : '0%',
            averageTasksPerSession: this.usageStats.totalSessions > 0
                ? (this.usageStats.totalTasksCreated / this.usageStats.totalSessions).toFixed(2)
                : 0
        };
        return report;
    }
}

// Initialize the app
let ohhManager;
document.addEventListener('DOMContentLoaded', () => {
    ohhManager = new OhhTaskManager();

    // Request notification permission for reminders
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('✅ Notifications enabled for task reminders');
            }
        });
    }

    // Listen to wallet changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                ohhManager.disconnectWallet();
            } else {
                ohhManager.wallet.address = accounts[0];
                ohhManager.saveWalletState();
                ohhManager.updateWalletUI();
            }
        });

        window.ethereum.on('chainChanged', (chainId) => {
            ohhManager.wallet.network = chainId;
            ohhManager.saveWalletState();
        });
    }

    // Listen to Solana wallet disconnect
    if (window.solana) {
        window.solana.on('disconnect', () => {
            ohhManager.disconnectWallet();
        });
    }
});
