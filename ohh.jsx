// ohh - Web3 Task Manager
// A simple, elegant task manager for remembering on-chain activities

class OhhTaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.userEmail = this.loadUserEmail();
        this.reminderSettings = this.loadReminderSettings();
        this.usageStats = this.loadUsageStats();
        this.wallets = this.loadWallets();
        this.currentWalletId = null;
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
        this.updateEmailStatus();
        this.renderSavedWallets();
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

        // Wallet Management
        document.getElementById('myWalletsBtn').addEventListener('click', () => {
            document.getElementById('walletsModal').classList.add('active');
        });

        document.getElementById('addWalletBtn').addEventListener('click', () => {
            this.addNewWallet();
        });

        document.getElementById('validateWalletBtn').addEventListener('click', () => {
            this.validateWalletAddress();
        });

        // Allow Enter key to add wallet
        document.getElementById('walletAddress').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewWallet();
        });

        document.getElementById('walletName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewWallet();
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

    // ========== SAFE WALLET MANAGEMENT ==========
    
    /**
     * Add a new wallet address safely
     * No connection to blockchain - just storing the address locally
     */
    addNewWallet() {
        const address = document.getElementById('walletAddress').value.trim();
        const name = document.getElementById('walletName').value.trim();

        // Validate inputs
        if (!address) {
            alert('❌ Please enter a wallet address');
            return;
        }

        if (!name) {
            alert('❌ Please give your wallet a name');
            return;
        }

        // Basic Ethereum address validation (0x + 40 hex characters)
        const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
        // Basic Solana address validation (44 base58 characters)
        const isSolanaAddress = /^[1-9A-HJ-NP-Z]{44}$/.test(address);

        if (!isEthAddress && !isSolanaAddress) {
            alert('❌ Invalid wallet address. Please enter a valid Ethereum (0x...) or Solana address');
            return;
        }

        // Check if address already exists
        if (this.wallets.some(w => w.address.toLowerCase() === address.toLowerCase())) {
            alert('⚠️ This wallet address is already saved');
            return;
        }

        // Create new wallet object
        const walletId = Date.now();
        const newWallet = {
            id: walletId,
            address: address,
            name: name,
            type: isEthAddress ? 'ethereum' : 'solana',
            addedAt: new Date().toISOString(),
            notes: ''
        };

        // Add to list
        this.wallets.push(newWallet);
        this.saveWallets();
        this.renderSavedWallets();

        // Clear inputs
        document.getElementById('walletAddress').value = '';
        document.getElementById('walletName').value = '';

        // Show success message
        this.showInAppNotification(`✅ Wallet \"${name}\" added successfully!`);
    }

    /**
     * Validate wallet address format
     */
    validateWalletAddress() {
        const address = document.getElementById('walletAddress').value.trim();

        if (!address) {
            alert('❌ Please enter a wallet address');
            return;
        }

        const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
        const isSolanaAddress = /^[1-9A-HJ-NP-Z]{44}$/.test(address);

        if (isEthAddress) {
            alert(`✅ Valid Ethereum address\nChecksum: ${address.substring(0, 6)}...${address.substring(38)}`);
        } else if (isSolanaAddress) {
            alert(`✅ Valid Solana address\nStart: ${address.substring(0, 6)}\nEnd: ...${address.substring(38)}`);
        } else {
            alert('❌ Invalid address format');
        }
    }

    /**
     * Delete a saved wallet
     */
    deleteWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        if (confirm(`Delete wallet \"${wallet.name}\"? This action cannot be undone.`)) {
            this.wallets = this.wallets.filter(w => w.id !== walletId);
            this.saveWallets();
            this.renderSavedWallets();
            this.showInAppNotification(`🗑️ Wallet \"${wallet.name}\" deleted`);
        }
    }

    /**
     * Render saved wallets list
     */
    renderSavedWallets() {
        const container = document.getElementById('savedWalletsList');
        
        if (this.wallets.length === 0) {
            container.innerHTML = '<p style=\"font-size: 13px; color: #7a8fa6; text-align: center; padding: 20px 0;\">No wallets saved yet. Add one above!</p>';
            return;
        }

        container.innerHTML = this.wallets.map(wallet => `
            <div style="
                background: rgba(79, 147, 255, 0.05);
                border: 1px solid rgba(79, 147, 255, 0.15);
                border-radius: 8px;
                padding: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div style=\"flex: 1;\">
                    <div style=\"font-weight: 600; font-size: 13px; color: #e0e6ed; margin-bottom: 4px;\">
                        ${wallet.type === 'ethereum' ? '🔗' : '⚡'} ${wallet.name}
                    </div>
                    <div style=\"font-size: 11px; color: #7a8fa6; font-family: monospace; word-break: break-all;\">
                        ${wallet.address.substring(0, 12)}...${wallet.address.substring(wallet.address.length - 10)}
                    </div>
                </div>
                <div style=\"display: flex; gap: 4px; margin-left: 12px;\">
                    <button 
                        onclick="ohhManager.selectWallet(${wallet.id})"
                        style=\"padding: 6px 10px; font-size: 12px; background: rgba(79, 147, 255, 0.1); border: 1px solid #4f93ff; border-radius: 4px; color: #4f93ff; cursor: pointer; font-weight: 500; transition: all 0.2s ease;\"
                        onmouseover=\"this.style.background='rgba(79, 147, 255, 0.2)'\"
                        onmouseout=\"this.style.background='rgba(79, 147, 255, 0.1)'\">
                        Select
                    </button>
                    <button 
                        onclick=\"ohhManager.deleteWallet(${wallet.id})\"
                        style=\"padding: 6px 10px; font-size: 12px; background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3); border-radius: 4px; color: #ff6b6b; cursor: pointer; font-weight: 500; transition: all 0.2s ease;\"
                        onmouseover=\"this.style.background='rgba(220, 53, 69, 0.2)'\"
                        onmouseout=\"this.style.background='rgba(220, 53, 69, 0.1)'\">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Select a wallet as active
     */
    selectWallet(walletId) {
        const wallet = this.wallets.find(w => w.id === walletId);
        if (!wallet) return;

        this.currentWalletId = walletId;
        this.wallet.address = wallet.address;
        this.wallet.connected = true;
        this.wallet.type = wallet.type;
        
        this.updateWalletUI();
        this.showInAppNotification(`✅ Selected \"${wallet.name}\"`);
    }

    /**
     * Load wallets from localStorage
     */
    loadWallets() {
        const stored = localStorage.getItem('ohhWallets');
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Save wallets to localStorage
     */
    saveWallets() {
        localStorage.setItem('ohhWallets', JSON.stringify(this.wallets));
    }

    /**
     * Update wallet UI to show current selection
     */
    updateWalletUI() {
        const statusEl = document.getElementById('walletStatus');
        
        if (this.wallet.connected && this.currentWalletId) {
            const wallet = this.wallets.find(w => w.id === this.currentWalletId);
            if (wallet) {
                statusEl.innerHTML = `✅ Using: <strong>${wallet.name}</strong><br><small style="color: #7a8fa6; font-family: monospace;">${wallet.address.substring(0, 10)}...${wallet.address.substring(wallet.address.length - 8)}</small>`;
                statusEl.classList.add('connected');
                return;
            }
        }
        
        statusEl.textContent = '👤 No wallet selected';
        statusEl.classList.remove('connected');
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

    // Note: Old wallet connection listeners removed
    // The app now uses a safe manual wallet address input instead
});
