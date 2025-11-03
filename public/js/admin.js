const API_BASE = '/api';

class AdminDashboard {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadDashboardData();
        this.showPage('dashboard');
    }

    checkAuth() {
        if (!this.token || this.user.role !== 'admin') {
            window.location.href = '/';
            return;
        }
        this.safeUpdateText('userName', `${this.user.firstName} ${this.user.lastName}`);
        this.safeUpdateText('adminName', this.user.firstName);
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.showPage(page);
            });
        });

        // Logs functionality
        this.safeAddEventListener('applyLogFilters', 'click', () => this.loadLogs(1));
        this.safeAddEventListener('clearLogFilters', 'click', () => this.clearLogFilters());
        this.safeAddEventListener('exportLogsBtn', 'click', () => this.exportLogs());
        this.safeAddEventListener('cleanupLogsBtn', 'click', () => this.cleanupLogs());

        // Logout
        this.safeAddEventListener('logoutBtn', 'click', () => {
            localStorage.clear();
            window.location.href = '/';
        });

        // Add User Modal
        this.safeAddEventListener('addUserBtn', 'click', () => this.showModal('addUserModal'));

        // Add Department Modal
        this.safeAddEventListener('addDeptBtn', 'click', () => this.showModal('addDeptModal'));

        // Add Task Modal
        this.safeAddEventListener('addTaskBtn', 'click', () => this.showModal('addTaskModal'));

        // Settings form
        this.safeAddEventListener('companyForm', 'submit', (e) => {
            e.preventDefault();
            this.saveCompanySettings();
        });

        // Close modals
        document.querySelectorAll('.close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Add User Form
        this.safeAddEventListener('addUserForm', 'submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        // Add Department Form
        this.safeAddEventListener('addDeptForm', 'submit', (e) => {
            e.preventDefault();
            this.addDepartment();
        });

        // Add Task Form
        this.safeAddEventListener('addTaskForm', 'submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Search functionality
        this.safeAddEventListener('userSearch', 'input', (e) => this.searchUsers(e.target.value));
        this.safeAddEventListener('taskSearch', 'input', (e) => this.searchTasks(e.target.value));
        this.safeAddEventListener('requestSearch', 'input', (e) => this.searchRequests(e.target.value));
        this.safeAddEventListener('attendanceDate', 'change', (e) => this.loadAttendance(e.target.value));
    }

    // Safe element utility methods
    safeUpdateText(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element with id '${elementId}' not found`);
        }
    }

    safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        } else {
            console.warn(`Cannot add event listener to '${elementId}' - element not found`);
        }
    }

    showPage(pageName) {
        console.log(`Showing page: ${pageName}`);
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(`${pageName}-page`);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.error(`Page with id '${pageName}-page' not found`);
        }
        
        // Activate corresponding nav item
        const navItem = document.querySelector(`[data-page="${pageName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }

        // Load page-specific data
        switch(pageName) {
            case 'users':
                this.loadUsers();
                break;
            case 'departments':
                this.loadDepartments();
                break;
            case 'attendance':
                this.loadAttendance();
                break;
            case 'tasks':
                this.loadTasks();
                break;
            case 'requests':
                this.loadRequests();
                break;
            case 'documents':
                this.loadDocuments();
                break;
            case 'reports':
                this.loadReports();
                break;
            case 'logs':
                this.loadLogs();
                this.loadLogActions();
                break;
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            // Load dynamic data for modals
            if (modalId === 'addTaskModal') {
                this.loadUsersForTaskAssignment();
            }
        } else {
            console.warn(`Modal with id '${modalId}' not found`);
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading admin dashboard data...');
            
            // Initialize all dashboard elements with default values
            const dashboardElements = [
                'totalUsers', 'totalDepartments', 'pendingTasks', 
                'pendingRequests', 'activeToday', 'totalLogs'
            ];
            
            dashboardElements.forEach(id => this.safeUpdateText(id, '0'));

            // Use Promise.allSettled to handle individual API failures gracefully
            const [usersResponse, deptResponse, tasksResponse, requestsResponse, logsResponse] = await Promise.allSettled([
                this.apiCall('/users'),
                this.apiCall('/departments'),
                this.apiCall('/tasks'),
                this.apiCall('/requests'),
                this.apiCall('/logs?limit=1') // Just to get count
            ]);

            // Handle users response
            if (usersResponse.status === 'fulfilled' && usersResponse.value?.status === 'success') {
                const users = usersResponse.value.data?.users || [];
                this.safeUpdateText('totalUsers', users.length.toString());
                this.updateUserStats(users);
            }

            // Handle departments response
            if (deptResponse.status === 'fulfilled' && deptResponse.value?.status === 'success') {
                const depts = deptResponse.value.data?.departments || [];
                this.safeUpdateText('totalDepartments', depts.length.toString());
            }

            // Handle tasks response
            let pendingTasksCount = 0;
            if (tasksResponse.status === 'fulfilled' && tasksResponse.value?.status === 'success') {
                const tasks = tasksResponse.value.data?.tasks || [];
                pendingTasksCount = tasks.filter(task => 
                    task.status === 'todo' || task.status === 'progress'
                ).length;
            }
            this.safeUpdateText('pendingTasks', pendingTasksCount.toString());

            // Handle requests response
            let pendingRequestsCount = 0;
            if (requestsResponse.status === 'fulfilled' && requestsResponse.value?.status === 'success') {
                const requests = requestsResponse.value.data?.requests || [];
                pendingRequestsCount = requests.filter(req => 
                    req.status === 'pending'
                ).length;
            }
            this.safeUpdateText('pendingRequests', pendingRequestsCount.toString());
            this.safeUpdateText('activeToday', pendingRequestsCount.toString()); // Using same value for now

            // Handle logs response
            if (logsResponse.status === 'fulfilled' && logsResponse.value?.status === 'success') {
                this.safeUpdateText('totalLogs', logsResponse.value.results?.toString() || '0');
            }

            this.loadRecentActivity();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set safe defaults on error
            this.safeUpdateText('totalUsers', '0');
            this.safeUpdateText('totalDepartments', '0');
            this.safeUpdateText('pendingTasks', '0');
            this.safeUpdateText('pendingRequests', '0');
            this.safeUpdateText('activeToday', '0');
            this.safeUpdateText('totalLogs', '0');
        }
    }

    updateUserStats(users) {
        const activeUsers = users.filter(user => user.isActive).length;
        const adminCount = users.filter(user => user.role === 'admin').length;
        const managerCount = users.filter(user => user.role === 'manager').length;
        const employeeCount = users.filter(user => user.role === 'employee').length;

        const statsGrid = document.querySelector('.stats-grid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-info">
                        <h3>${activeUsers}</h3>
                        <p>Active Users</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👑</div>
                    <div class="stat-info">
                        <h3>${adminCount}</h3>
                        <p>Admins</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💼</div>
                    <div class="stat-info">
                        <h3>${managerCount}</h3>
                        <p>Managers</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👨‍💼</div>
                    <div class="stat-info">
                        <h3>${employeeCount}</h3>
                        <p>Employees</p>
                    </div>
                </div>
            `;
        }
    }

    loadRecentActivity() {
        const activityList = document.getElementById('activityList');
        if (activityList) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">👥</div>
                    <div>
                        <strong>System initialized</strong>
                        <p>Admin dashboard loaded successfully</p>
                        <small>Just now</small>
                    </div>
                </div>
                <div class="activity-item">
                    <div class="activity-icon">⚙️</div>
                    <div>
                        <strong>Ready for management</strong>
                        <p>All admin features are now available</p>
                        <small>Just now</small>
                    </div>
                </div>
            `;
        }
    }

    // LOGS MANAGEMENT
    async loadLogs(page = 1) {
        try {
            this.showLoading('logsTableBody');
            
            const filters = this.getLogFilters();
            const queryParams = new URLSearchParams({
                page,
                limit: 50,
                ...filters
            });

            const response = await this.apiCall(`/logs?${queryParams}`);
            
            if (response.status === 'success') {
                this.logs = response.data.logs;
                this.updateLogsUI(this.logs);
                this.updateLogsPagination(response.data.pagination);
            } else {
                this.showError('logsTableBody', 'Failed to load logs');
            }
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showError('logsTableBody', 'Failed to load logs');
        }
    }

    getLogFilters() {
        const filters = {};
        
        const action = document.getElementById('logActionFilter')?.value;
        const severity = document.getElementById('logSeverityFilter')?.value;
        const startDate = document.getElementById('logStartDate')?.value;
        const endDate = document.getElementById('logEndDate')?.value;
        const search = document.getElementById('logSearch')?.value;

        if (action) filters.action = action;
        if (severity) filters.severity = severity;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (search) filters.search = search;

        return filters;
    }

    clearLogFilters() {
        const elements = [
            'logActionFilter', 'logSeverityFilter', 'logStartDate', 
            'logEndDate', 'logSearch'
        ];
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        
        this.loadLogs(1);
    }

    updateLogsUI(logs) {
        const tbody = document.getElementById('logsTableBody');
        if (!tbody) return;
        
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No logs found</td></tr>';
            return;
        }
        
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>
                    <small>${new Date(log.createdAt).toLocaleDateString()}</small><br>
                    <small>${new Date(log.createdAt).toLocaleTimeString()}</small>
                </td>
                <td>
                    <span class="log-action">${log.action ? log.action.replace(/_/g, ' ') : 'Unknown'}</span>
                </td>
                <td>${log.description || 'No description'}</td>
                <td>
                    ${log.user ? `
                        <strong>${log.user.firstName} ${log.user.lastName}</strong><br>
                        <small>${log.user.role} • ${log.user.email}</small>
                    ` : 'System'}
                </td>
                <td>
                    <span class="severity-badge severity-${log.severity || 'low'}">
                        ${log.severity || 'low'}
                    </span>
                </td>
                <td>
                    <small>${log.ipAddress || 'N/A'}</small>
                </td>
            </tr>
        `).join('');
    }

    updateLogsPagination(pagination) {
        const paginationContainer = document.getElementById('logsPagination');
        if (!paginationContainer) return;
        
        if (!pagination || pagination.pages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Previous button
        if (pagination.current > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="admin.loadLogs(${pagination.current - 1})">Previous</button>`;
        }

        // Page numbers
        const maxPages = 5;
        let startPage = Math.max(1, pagination.current - Math.floor(maxPages / 2));
        let endPage = Math.min(pagination.pages, startPage + maxPages - 1);
        
        if (endPage - startPage + 1 < maxPages) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            if (i === pagination.current) {
                paginationHTML += `<span class="pagination-current">${i}</span>`;
            } else {
                paginationHTML += `<button class="pagination-btn" onclick="admin.loadLogs(${i})">${i}</button>`;
            }
        }

        // Next button
        if (pagination.current < pagination.pages) {
            paginationHTML += `<button class="pagination-btn" onclick="admin.loadLogs(${pagination.current + 1})">Next</button>`;
        }

        paginationContainer.innerHTML = paginationHTML;
    }

    async loadLogActions() {
        try {
            const response = await this.apiCall('/logs/actions');
            if (response.status === 'success') {
                const actionSelect = document.getElementById('logActionFilter');
                if (actionSelect) {
                    actionSelect.innerHTML = '<option value="">All Actions</option>' +
                        response.data.actions.map(action => 
                            `<option value="${action}">${action.replace(/_/g, ' ')}</option>`
                        ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading log actions:', error);
        }
    }

    async exportLogs() {
        try {
            const filters = this.getLogFilters();
            const queryParams = new URLSearchParams(filters);
            
            const response = await this.apiCall(`/logs?${queryParams}&limit=1000`);
            if (response.status === 'success') {
                this.downloadLogsAsCSV(response.data.logs);
            }
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.showNotification('Error exporting logs', 'error');
        }
    }

    downloadLogsAsCSV(logs) {
        const headers = ['Timestamp', 'Action', 'Description', 'User', 'Role', 'Severity', 'IP Address'];
        const csvData = logs.map(log => [
            new Date(log.createdAt).toISOString(),
            log.action,
            `"${(log.description || '').replace(/"/g, '""')}"`,
            log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
            log.user ? log.user.role : 'System',
            log.severity,
            log.ipAddress || 'N/A'
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.showNotification('Logs exported successfully as CSV', 'success');
    }

    async cleanupLogs() {
        const days = prompt('Delete logs older than how many days?', '90');
        if (days && !isNaN(days)) {
            if (confirm(`Are you sure you want to delete logs older than ${days} days? This action cannot be undone.`)) {
                try {
                    const response = await this.apiCall(`/logs/cleanup?days=${days}`, 'DELETE');
                    if (response.status === 'success') {
                        this.showNotification(`Cleaned up ${response.data.deletedCount} old logs`, 'success');
                        this.loadLogs();
                    }
                } catch (error) {
                    console.error('Error cleaning up logs:', error);
                    this.showNotification('Error cleaning up logs', 'error');
                }
            }
        }
    }

    // USER MANAGEMENT
    async loadUsers() {
        try {
            this.showLoading('usersTableBody');
            const response = await this.apiCall('/users');
            
            if (response.status === 'success') {
                this.users = response.data.users;
                this.updateUsersUI(this.users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('usersTableBody', 'Failed to load users');
        }
    }

    updateUsersUI(users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="user-info">
                        <strong>${user.firstName} ${user.lastName}</strong>
                        ${user.employeeId ? `<br><small>ID: ${user.employeeId}</small>` : ''}
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="status-badge ${user.role === 'admin' ? 'status-admin' : user.role === 'manager' ? 'status-manager' : 'status-employee'}">
                        ${user.role.toUpperCase()}
                    </span>
                </td>
                <td>
                    <span class="dept-badge">${user.department}</span>
                </td>
                <td>${user.position}</td>
                <td>
                    <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <small>Joined: ${new Date(user.createdAt).toLocaleDateString()}</small><br>
                    <small>Last login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</small>
                </td>
                <td class="action-buttons">
                    <button class="btn-primary" onclick="admin.editUser('${user._id}')">Edit</button>
                    <button class="btn-warning" onclick="admin.toggleUserStatus('${user._id}', ${!user.isActive})">
                        ${user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn-danger" onclick="admin.deleteUser('${user._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    async addUser() {
        const form = document.getElementById('addUserForm');
        if (!form) return;

        const formData = new FormData(form);
        
        const userData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email'),
            password: formData.get('password'),
            department: formData.get('department'),
            position: formData.get('position'),
            role: formData.get('role')
        };

        try {
            const response = await this.apiCall('/auth/register', 'POST', userData);
            
            if (response.status === 'success') {
                this.showNotification('User added successfully!', 'success');
                this.hideModal('addUserModal');
                this.loadUsers();
                this.loadDashboardData();
            } else {
                this.showNotification('Error: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error adding user:', error);
            this.showNotification('Error adding user: ' + error.message, 'error');
        }
    }

    // ... (rest of your methods with similar safe element checks)

    // UTILITY METHODS
    async apiCall(endpoint, method = 'GET', data = null) {
        try {
            const options = {
                method,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            };
    
            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }
    
            const response = await fetch(`${API_BASE}${endpoint}`, options);
            
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '/';
                return { status: 'error', message: 'Unauthorized' };
            }
            
            if (response.status === 404) {
                console.log(`Endpoint ${endpoint} not found (404)`);
                return { status: 'error', message: 'Endpoint not found' };
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error: ${endpoint}`, error);
            return { status: 'error', message: error.message };
        }
    }

    showLoading(selector) {
        const element = typeof selector === 'string' ? document.getElementById(selector) : selector;
        if (element) {
            element.innerHTML = `
                <tr><td colspan="8" style="text-align: center; padding: 2rem;">
                    <div>⏳ Loading...</div>
                </td></tr>
            `;
        }
    }

    showError(selector, message) {
        const element = typeof selector === 'string' ? document.getElementById(selector) : selector;
        if (element) {
            element.innerHTML = `
                <tr><td colspan="8" style="text-align: center; padding: 2rem; color: #666;">
                    <div>❌</div>
                    <div>${message}</div>
                </td></tr>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 1rem 1.5rem;
                    border-radius: 5px;
                    color: white;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .notification-success { background: var(--success-green); color: #2d5016; }
                .notification-error { background: var(--error-red); color: #7c1d1d; }
                .notification-warning { background: var(--warning-orange); color: #7c5a16; }
                .notification-info { background: var(--light-blue); color: #333; }
                .notification button {
                    background: none;
                    border: none;
                    color: inherit;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize the admin dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.admin = new AdminDashboard();
});