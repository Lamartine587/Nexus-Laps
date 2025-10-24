const API_BASE = 'http://localhost:5000/api';

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
        document.getElementById('userName').textContent = `${this.user.firstName} ${this.user.lastName}`;
        document.getElementById('adminName').textContent = this.user.firstName;
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
document.getElementById('applyLogFilters')?.addEventListener('click', () => {
    this.loadLogs(1);
});

document.getElementById('clearLogFilters')?.addEventListener('click', () => {
    document.getElementById('logActionFilter').value = '';
    document.getElementById('logSeverityFilter').value = '';
    document.getElementById('logStartDate').value = '';
    document.getElementById('logEndDate').value = '';
    document.getElementById('logSearch').value = '';
    this.loadLogs(1);
});

document.getElementById('exportLogsBtn')?.addEventListener('click', () => {
    this.exportLogs();
});

document.getElementById('cleanupLogsBtn')?.addEventListener('click', () => {
    this.cleanupLogs();
});

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/';
        });

        // Add User Modal
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showModal('addUserModal');
        });

        // Add Department Modal
        document.getElementById('addDeptBtn').addEventListener('click', () => {
            this.showModal('addDeptModal');
        });

        // Add Task Modal
        document.getElementById('addTaskBtn')?.addEventListener('click', () => {
            this.showModal('addTaskModal');
        });

        // Settings form
        document.getElementById('companyForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCompanySettings();
        });

        // Close modals
        document.querySelectorAll('.close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Add User Form
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        // Add Department Form
        document.getElementById('addDeptForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addDepartment();
        });

        // Add Task Form
        document.getElementById('addTaskForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask();
        });

        // Search functionality
        document.getElementById('userSearch')?.addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });

        document.getElementById('taskSearch')?.addEventListener('input', (e) => {
            this.searchTasks(e.target.value);
        });

        document.getElementById('requestSearch')?.addEventListener('input', (e) => {
            this.searchRequests(e.target.value);
        });

        document.getElementById('attendanceDate')?.addEventListener('change', (e) => {
            this.loadAttendance(e.target.value);
        });
    }

    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected page
        document.getElementById(`${pageName}-page`).classList.add('active');
        
        // Activate corresponding nav item
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

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
        document.getElementById(modalId).style.display = 'block';
        // Load dynamic data for modals
        if (modalId === 'addTaskModal') {
            this.loadUsersForTaskAssignment();
        }
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
        document.querySelectorAll(`#${modalId} form`).forEach(form => form.reset());
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading admin dashboard data...');
            
            // Helper function to safely update element text
            const safeUpdate = (elementId, value) => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.textContent = value;
                } else {
                    console.warn(`Element with id '${elementId}' not found`);
                }
            };
    
            // Use Promise.allSettled to handle individual API failures
            const [usersResponse, deptResponse, tasksResponse, requestsResponse] = await Promise.allSettled([
                this.apiCall('/users'),
                this.apiCall('/departments'),
                this.apiCall('/tasks'),
                this.apiCall('/requests')
            ]);
    
            // Handle users response
            if (usersResponse.status === 'fulfilled' && usersResponse.value && usersResponse.value.status === 'success') {
                safeUpdate('totalUsers', usersResponse.value.results || 0);
                this.updateUserStats(usersResponse.value.data.users);
            } else {
                safeUpdate('totalUsers', 0);
                console.log('Users endpoint failed:', usersResponse.reason);
            }
    
            // Handle departments response
            if (deptResponse.status === 'fulfilled' && deptResponse.value && deptResponse.value.status === 'success') {
                safeUpdate('totalDepartments', deptResponse.value.results || 0);
            } else {
                safeUpdate('totalDepartments', 0);
                console.log('Departments endpoint failed:', deptResponse.reason);
            }
    
            // Handle tasks response - with fallback for missing endpoint
            let pendingTasksCount = 0;
            if (tasksResponse.status === 'fulfilled' && tasksResponse.value && tasksResponse.value.status === 'success') {
                pendingTasksCount = tasksResponse.value.data.tasks.filter(task => 
                    task.status === 'todo' || task.status === 'progress'
                ).length;
            } else {
                console.log('Tasks endpoint failed or not available:', tasksResponse.reason);
            }
            safeUpdate('pendingTasks', pendingTasksCount);
    
            // Handle requests response - with fallback for missing endpoint
            let pendingRequestsCount = 0;
            if (requestsResponse.status === 'fulfilled' && requestsResponse.value && requestsResponse.value.status === 'success') {
                pendingRequestsCount = requestsResponse.value.data.requests.filter(req => 
                    req.status === 'pending'
                ).length;
            } else {
                console.log('Requests endpoint failed or not available:', requestsResponse.reason);
            }
            safeUpdate('activeToday', pendingRequestsCount);
    
            this.loadRecentActivity();
    
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Set safe defaults on error
            this.safeUpdate('totalUsers', 0);
            this.safeUpdate('totalDepartments', 0);
            this.safeUpdate('pendingTasks', 0);
            this.safeUpdate('activeToday', 0);
        }
    }
    
    // Add this helper method to the class
    safeUpdate(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element with id '${elementId}' not found`);
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
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        this.showError('logsTableBody', 'Failed to load logs');
    }
}

getLogFilters() {
    const filters = {};
    
    const action = document.getElementById('logActionFilter').value;
    const severity = document.getElementById('logSeverityFilter').value;
    const startDate = document.getElementById('logStartDate').value;
    const endDate = document.getElementById('logEndDate').value;
    const search = document.getElementById('logSearch').value;

    if (action) filters.action = action;
    if (severity) filters.severity = severity;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (search) filters.search = search;

    return filters;
}

updateLogsUI(logs) {
    const tbody = document.getElementById('logsTableBody');
    
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
                <span class="log-action">${log.action.replace(/_/g, ' ')}</span>
            </td>
            <td>${log.description}</td>
            <td>
                ${log.user ? `
                    <strong>${log.user.firstName} ${log.user.lastName}</strong><br>
                    <small>${log.user.role} • ${log.user.email}</small>
                ` : 'System'}
            </td>
            <td>
                <span class="severity-badge severity-${log.severity}">
                    ${log.severity}
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
    for (let i = 1; i <= pagination.pages; i++) {
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
            actionSelect.innerHTML = '<option value="">All Actions</option>' +
                response.data.actions.map(action => 
                    `<option value="${action}">${action.replace(/_/g, ' ')}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Error loading log actions:', error);
    }
}

async exportLogs() {
    try {
        const filters = this.getLogFilters();
        const queryParams = new URLSearchParams(filters);
        
        // This would typically generate a CSV or PDF on the server
        this.showNotification('Export feature would generate a log report file', 'info');
    } catch (error) {
        console.error('Error exporting logs:', error);
        this.showNotification('Error exporting logs', 'error');
    }
}

async cleanupLogs() {
    if (confirm('Are you sure you want to delete logs older than 90 days? This action cannot be undone.')) {
        try {
            const response = await this.apiCall('/logs/cleanup', 'DELETE');
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

    loadRecentActivity() {
        const activityList = document.getElementById('activityList');
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

    async editUser(userId) {
        const user = this.users.find(u => u._id === userId);
        if (!user) return;

        const newRole = prompt('Enter new role (admin/manager/employee):', user.role);
        const newDepartment = prompt('Enter new department:', user.department);
        const newPosition = prompt('Enter new position:', user.position);

        if (newRole && newDepartment && newPosition) {
            try {
                const response = await this.apiCall(`/users/${userId}`, 'PATCH', {
                    role: newRole,
                    department: newDepartment,
                    position: newPosition
                });

                if (response.status === 'success') {
                    this.showNotification('User updated successfully!', 'success');
                    this.loadUsers();
                } else {
                    this.showNotification('Error updating user: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error updating user:', error);
                this.showNotification('Error updating user', 'error');
            }
        }
    }

    async toggleUserStatus(userId, newStatus) {
        const action = newStatus ? 'activate' : 'deactivate';
        if (confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                const response = await this.apiCall(`/users/${userId}/deactivate`, 'PATCH', {
                    isActive: newStatus
                });
                
                if (response.status === 'success') {
                    this.showNotification(`User ${action}d successfully!`, 'success');
                    this.loadUsers();
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error updating user status:', error);
                this.showNotification('Error updating user status', 'error');
            }
        }
    }

    async deleteUser(userId) {
        const user = this.users.find(u => u._id === userId);
        if (!user) return;

        if (confirm(`Are you sure you want to delete user ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
            try {
                const response = await this.apiCall(`/users/${userId}`, 'DELETE');
                
                if (response.status === 'success') {
                    this.showNotification('User deleted successfully!', 'success');
                    this.loadUsers();
                    this.loadDashboardData();
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showNotification('Error deleting user', 'error');
            }
        }
    }

    searchUsers(query) {
        if (!this.users) return;
        
        const filteredUsers = this.users.filter(user => 
            user.firstName.toLowerCase().includes(query.toLowerCase()) ||
            user.lastName.toLowerCase().includes(query.toLowerCase()) ||
            user.email.toLowerCase().includes(query.toLowerCase()) ||
            user.department.toLowerCase().includes(query.toLowerCase())
        );
        
        this.updateUsersUI(filteredUsers);
    }

    // ATTENDANCE MANAGEMENT
    async loadAttendance(date = null) {
        try {
            this.showLoading('attendanceTableBody');
            const endpoint = date ? `/attendance?date=${date}` : '/attendance';
            const response = await this.apiCall(endpoint);
            
            if (response.status === 'success') {
                this.attendance = response.data.attendance;
                this.updateAttendanceUI(this.attendance);
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
            this.showError('attendanceTableBody', 'Failed to load attendance data');
        }
    }

    updateAttendanceUI(attendance) {
        const tbody = document.getElementById('attendanceTableBody');
        
        if (!attendance || attendance.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No attendance records found</td></tr>';
            return;
        }
        
        tbody.innerHTML = attendance.map(record => `
            <tr>
                <td>
                    <strong>${record.employee?.firstName} ${record.employee?.lastName}</strong>
                    ${record.employee?.employeeId ? `<br><small>ID: ${record.employee.employeeId}</small>` : ''}
                </td>
                <td>${record.employee?.department}</td>
                <td>${record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A'}</td>
                <td>${record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'N/A'}</td>
                <td>${record.hoursWorked || 'N/A'}</td>
                <td>
                    <span class="status-badge ${this.getAttendanceStatusClass(record.status)}">
                        ${record.status}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn-primary" onclick="admin.editAttendance('${record._id}')">Edit</button>
                    <button class="btn-danger" onclick="admin.deleteAttendance('${record._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    getAttendanceStatusClass(status) {
        const statusClasses = {
            'present': 'status-active',
            'absent': 'status-inactive',
            'late': 'status-warning',
            'half-day': 'status-pending',
            'holiday': 'status-info'
        };
        return statusClasses[status] || 'status-inactive';
    }

    async editAttendance(attendanceId) {
        const record = this.attendance.find(a => a._id === attendanceId);
        if (!record) return;

        const newStatus = prompt('Enter new status (present/absent/late/half-day/holiday):', record.status);

        if (newStatus) {
            try {
                const response = await this.apiCall(`/attendance/${attendanceId}`, 'PATCH', {
                    status: newStatus
                });

                if (response.status === 'success') {
                    this.showNotification('Attendance record updated successfully!', 'success');
                    this.loadAttendance();
                }
            } catch (error) {
                console.error('Error updating attendance:', error);
                this.showNotification('Error updating attendance record', 'error');
            }
        }
    }

    async deleteAttendance(attendanceId) {
        const record = this.attendance.find(a => a._id === attendanceId);
        if (!record) return;

        if (confirm(`Are you sure you want to delete this attendance record? This action cannot be undone.`)) {
            try {
                const response = await this.apiCall(`/attendance/${attendanceId}`, 'DELETE');
                
                if (response.status === 'success') {
                    this.showNotification('Attendance record deleted successfully!', 'success');
                    this.loadAttendance();
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting attendance record:', error);
                this.showNotification('Error deleting attendance record', 'error');
            }
        }
    }

    // DEPARTMENT MANAGEMENT
    async loadDepartments() {
        try {
            const [deptResponse, usersResponse] = await Promise.all([
                this.apiCall('/departments'),
                this.apiCall('/users')
            ]);

            this.departments = deptResponse.status === 'success' ? deptResponse.data.departments : [];
            this.users = usersResponse.status === 'success' ? usersResponse.data.users : [];

            this.updateDepartmentsUI();
        } catch (error) {
            console.error('Error loading departments:', error);
            this.showError('.cards-grid', 'Failed to load departments');
        }
    }

    updateDepartmentsUI() {
        const grid = document.querySelector('.cards-grid');
        
        if (this.departments && this.departments.length > 0) {
            // Count employees per department
            const deptStats = {};
            this.users.forEach(user => {
                if (user.isActive) {
                    deptStats[user.department] = (deptStats[user.department] || 0) + 1;
                }
            });

            grid.innerHTML = this.departments.map(dept => `
                <div class="department-card">
                    <h3>${dept.name} Department</h3>
                    <p>${dept.description || 'Department management'}</p>
                    <div class="dept-stats">
                        <div class="stat">
                            <strong>${deptStats[dept.name] || 0}</strong>
                            <span>Employees</span>
                        </div>
                        <div class="stat">
                            <strong>${dept.budget ? `$${dept.budget.toLocaleString()}` : 'N/A'}</strong>
                            <span>Budget</span>
                        </div>
                    </div>
                    <div class="dept-meta">
                        <small>Created: ${new Date(dept.createdAt).toLocaleDateString()}</small>
                        <small>Status: ${dept.isActive ? 'Active' : 'Inactive'}</small>
                    </div>
                    <div class="dept-actions">
                        <button class="btn-primary" onclick="admin.editDepartment('${dept._id}')">Edit</button>
                        <button class="btn-danger" onclick="admin.deleteDepartment('${dept._id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = `
                <div class="department-card">
                    <h3>No Departments Found</h3>
                    <p>No departments have been created yet.</p>
                </div>
            `;
        }
    }

    async addDepartment() {
        const form = document.getElementById('addDeptForm');
        const formData = new FormData(form);
        
        const deptData = {
            name: formData.get('name'),
            description: formData.get('description'),
            budget: parseFloat(formData.get('budget')) || 0
        };

        try {
            const response = await this.apiCall('/departments', 'POST', deptData);
            
            if (response.status === 'success') {
                this.showNotification('Department added successfully!', 'success');
                this.hideModal('addDeptModal');
                this.loadDepartments();
                this.loadDashboardData();
            } else {
                this.showNotification('Error: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error adding department:', error);
            this.showNotification('Error adding department', 'error');
        }
    }

    async editDepartment(deptId) {
        const dept = this.departments.find(d => d._id === deptId);
        if (!dept) return;

        const newName = prompt('Enter new department name:', dept.name);
        const newDescription = prompt('Enter new description:', dept.description);
        const newBudget = prompt('Enter new budget:', dept.budget || 0);

        if (newName && newDescription) {
            try {
                const response = await this.apiCall(`/departments/${deptId}`, 'PATCH', {
                    name: newName,
                    description: newDescription,
                    budget: parseFloat(newBudget) || 0
                });

                if (response.status === 'success') {
                    this.showNotification('Department updated successfully!', 'success');
                    this.loadDepartments();
                } else {
                    this.showNotification('Error updating department: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error updating department:', error);
                this.showNotification('Error updating department', 'error');
            }
        }
    }

    async deleteDepartment(deptId) {
        const dept = this.departments.find(d => d._id === deptId);
        if (!dept) return;

        // Check if department has users
        const usersInDept = this.users.filter(user => user.department === dept.name && user.isActive);
        
        if (usersInDept.length > 0) {
            this.showNotification(`Cannot delete ${dept.name} department. There are ${usersInDept.length} active users in this department. Please reassign them first.`, 'error');
            return;
        }

        if (confirm(`Are you sure you want to delete the ${dept.name} department? This action cannot be undone.`)) {
            try {
                const response = await this.apiCall(`/departments/${deptId}`, 'DELETE');
                
                if (response.status === 'success') {
                    this.showNotification('Department deleted successfully!', 'success');
                    this.loadDepartments();
                    this.loadDashboardData();
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting department:', error);
                this.showNotification('Error deleting department', 'error');
            }
        }
    }

    // TASK MANAGEMENT
    async loadTasks() {
        try {
            this.showLoading('tasksTableBody');
            const response = await this.apiCall('/tasks');
            
            if (response.status === 'success') {
                this.tasks = response.data.tasks;
                this.updateTasksUI(this.tasks);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('tasksTableBody', 'Failed to load tasks');
        }
    }

    async loadUsersForTaskAssignment() {
        try {
            const response = await this.apiCall('/users');
            if (response.status === 'success') {
                const userSelect = document.getElementById('taskAssignedTo');
                userSelect.innerHTML = '<option value="">Select User</option>' +
                    response.data.users.map(user => 
                        `<option value="${user._id}">${user.firstName} ${user.lastName} (${user.department})</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('Error loading users for task assignment:', error);
        }
    }

    async addTask() {
        const form = document.getElementById('addTaskForm');
        const formData = new FormData(form);
        
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            assignedTo: formData.get('assignedTo'),
            department: formData.get('department'),
            priority: formData.get('priority'),
            dueDate: formData.get('dueDate'),
            estimatedHours: parseFloat(formData.get('estimatedHours')) || 0
        };

        try {
            const response = await this.apiCall('/tasks', 'POST', taskData);
            
            if (response.status === 'success') {
                this.showNotification('Task added successfully!', 'success');
                this.hideModal('addTaskModal');
                this.loadTasks();
            } else {
                this.showNotification('Error: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error adding task:', error);
            this.showNotification('Error adding task', 'error');
        }
    }

    updateTasksUI(tasks) {
        const tbody = document.getElementById('tasksTableBody');
        
        tbody.innerHTML = tasks.map(task => `
            <tr>
                <td>
                    <strong>${task.title}</strong>
                    <br><small>${task.description || 'No description'}</small>
                </td>
                <td>${task.assignedTo?.firstName} ${task.assignedTo?.lastName}</td>
                <td>${task.department}</td>
                <td>
                    <span class="status-badge ${this.getTaskStatusClass(task.status)}">
                        ${task.status}
                    </span>
                </td>
                <td>
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                </td>
                <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</td>
                <td class="action-buttons">
                    <button class="btn-primary" onclick="admin.editTask('${task._id}')">Edit</button>
                    <button class="btn-danger" onclick="admin.deleteTask('${task._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    getTaskStatusClass(status) {
        const statusClasses = {
            'todo': 'status-inactive',
            'progress': 'status-warning',
            'completed': 'status-active',
            'cancelled': 'status-inactive'
        };
        return statusClasses[status] || 'status-inactive';
    }

    async editTask(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;

        const newStatus = prompt('Enter new status (todo/progress/completed/cancelled):', task.status);
        const newPriority = prompt('Enter new priority (low/medium/high):', task.priority);

        if (newStatus && newPriority) {
            try {
                const response = await this.apiCall(`/tasks/${taskId}`, 'PATCH', {
                    status: newStatus,
                    priority: newPriority
                });

                if (response.status === 'success') {
                    this.showNotification('Task updated successfully!', 'success');
                    this.loadTasks();
                } else {
                    this.showNotification('Error updating task: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error updating task:', error);
                this.showNotification('Error updating task', 'error');
            }
        }
    }

    async deleteTask(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;

        if (confirm(`Are you sure you want to delete task "${task.title}"? This action cannot be undone.`)) {
            try {
                const response = await this.apiCall(`/tasks/${taskId}`, 'DELETE');
                
                if (response.status === 'success') {
                    this.showNotification('Task deleted successfully!', 'success');
                    this.loadTasks();
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting task:', error);
                this.showNotification('Error deleting task', 'error');
            }
        }
    }

    searchTasks(query) {
        if (!this.tasks) return;
        
        const filteredTasks = this.tasks.filter(task => 
            task.title.toLowerCase().includes(query.toLowerCase()) ||
            task.description.toLowerCase().includes(query.toLowerCase()) ||
            task.department.toLowerCase().includes(query.toLowerCase())
        );
        
        this.updateTasksUI(filteredTasks);
    }

    // REQUEST MANAGEMENT
    async loadRequests() {
        try {
            this.showLoading('requestsTableBody');
            const response = await this.apiCall('/requests');
            
            if (response.status === 'success') {
                this.requests = response.data.requests;
                this.updateRequestsUI(this.requests);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            this.showError('requestsTableBody', 'Failed to load requests');
        }
    }

    updateRequestsUI(requests) {
        const tbody = document.getElementById('requestsTableBody');
        
        tbody.innerHTML = requests.map(request => `
            <tr>
                <td>${request.requestId}</td>
                <td>
                    <strong>${request.type.toUpperCase()} - ${request.subject}</strong>
                    <br><small>${request.description.substring(0, 50)}...</small>
                </td>
                <td>${request.submittedBy?.firstName} ${request.submittedBy?.lastName}</td>
                <td>${request.department}</td>
                <td>
                    <span class="status-badge ${this.getRequestStatusClass(request.status)}">
                        ${request.status}
                    </span>
                </td>
                <td>${new Date(request.createdAt).toLocaleDateString()}</td>
                <td class="action-buttons">
                    <button class="btn-primary" onclick="admin.viewRequest('${request._id}')">View</button>
                    <button class="btn-success" onclick="admin.updateRequestStatus('${request._id}', 'approved')">Approve</button>
                    <button class="btn-danger" onclick="admin.updateRequestStatus('${request._id}', 'rejected')">Reject</button>
                </td>
            </tr>
        `).join('');
    }

    getRequestStatusClass(status) {
        const statusClasses = {
            'pending': 'status-warning',
            'approved': 'status-active',
            'rejected': 'status-inactive',
            'in-review': 'status-pending'
        };
        return statusClasses[status] || 'status-warning';
    }

    async viewRequest(requestId) {
        try {
            const response = await this.apiCall(`/requests/${requestId}`);
            
            if (response.status === 'success') {
                const request = response.data.request;
                let details = `Request ID: ${request.requestId}\n`;
                details += `Type: ${request.type}\n`;
                details += `Subject: ${request.subject}\n`;
                details += `Description: ${request.description}\n`;
                details += `Status: ${request.status}\n`;
                details += `Submitted By: ${request.submittedBy.firstName} ${request.submittedBy.lastName}\n`;
                details += `Department: ${request.department}\n`;
                details += `Submitted: ${new Date(request.createdAt).toLocaleDateString()}\n`;
                
                if (request.leaveType) {
                    details += `Leave Type: ${request.leaveType}\n`;
                    details += `Dates: ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}\n`;
                    details += `Total Days: ${request.totalDays}\n`;
                }
                
                if (request.expenseAmount) {
                    details += `Amount: $${request.expenseAmount}\n`;
                    details += `Category: ${request.expenseCategory}\n`;
                }
                
                alert(details);
            } else {
                this.showNotification('Error loading request details: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('Error viewing request:', error);
            this.showNotification('Error loading request details', 'error');
        }
    }

    async updateRequestStatus(requestId, newStatus) {
        const request = this.requests.find(r => r._id === requestId);
        if (!request) return;

        if (confirm(`Are you sure you want to ${newStatus} this request?`)) {
            try {
                const response = await this.apiCall(`/requests/${requestId}/status`, 'PATCH', {
                    status: newStatus
                });

                if (response.status === 'success') {
                    this.showNotification(`Request ${newStatus} successfully!`, 'success');
                    this.loadRequests();
                } else {
                    this.showNotification('Error updating request: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error updating request:', error);
                this.showNotification('Error updating request', 'error');
            }
        }
    }

    searchRequests(query) {
        if (!this.requests) return;
        
        const filteredRequests = this.requests.filter(request => 
            request.requestId.toLowerCase().includes(query.toLowerCase()) ||
            request.subject.toLowerCase().includes(query.toLowerCase()) ||
            request.type.toLowerCase().includes(query.toLowerCase()) ||
            request.submittedBy?.firstName.toLowerCase().includes(query.toLowerCase()) ||
            request.submittedBy?.lastName.toLowerCase().includes(query.toLowerCase())
        );
        
        this.updateRequestsUI(filteredRequests);
    }

    // DOCUMENT MANAGEMENT
    async loadDocuments() {
        try {
            const response = await this.apiCall('/documents/my-documents');
            
            if (response.status === 'success') {
                this.documents = response.data.documents;
                this.updateDocumentsUI(this.documents);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showError('documentsTableBody', 'Failed to load documents');
        }
    }

    updateDocumentsUI(documents) {
        const tbody = document.getElementById('documentsTableBody');
        
        tbody.innerHTML = documents.map(doc => `
            <tr>
                <td>
                    <strong>${doc.title}</strong>
                    <br><small>${doc.description || 'No description'}</small>
                </td>
                <td>${doc.category}</td>
                <td>${doc.department}</td>
                <td>${doc.accessLevel}</td>
                <td>${doc.downloadCount} downloads</td>
                <td>${new Date(doc.createdAt).toLocaleDateString()}</td>
                <td class="action-buttons">
                    <button class="btn-primary" onclick="admin.downloadDocument('${doc._id}')">Download</button>
                    <button class="btn-danger" onclick="admin.deleteDocument('${doc._id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    async downloadDocument(docId) {
        try {
            await this.apiCall(`/documents/${docId}/download`, 'PATCH');
            this.showNotification('Document download recorded.', 'success');
            this.loadDocuments();
        } catch (error) {
            console.error('Error downloading document:', error);
            this.showNotification('Error downloading document', 'error');
        }
    }

    async deleteDocument(docId) {
        const doc = this.documents.find(d => d._id === docId);
        if (!doc) return;

        if (confirm(`Are you sure you want to delete document "${doc.title}"? This action cannot be undone.`)) {
            try {
                const response = await this.apiCall(`/documents/${docId}`, 'DELETE');
                
                if (response.status === 'success') {
                    this.showNotification('Document deleted successfully!', 'success');
                    this.loadDocuments();
                } else {
                    this.showNotification('Error: ' + response.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting document:', error);
                this.showNotification('Error deleting document', 'error');
            }
        }
    }

    // REPORTS
    async loadReports() {
        try {
            const [usersResponse, tasksResponse, requestsResponse, attendanceResponse] = await Promise.all([
                this.apiCall('/users'),
                this.apiCall('/tasks'),
                this.apiCall('/requests'),
                this.apiCall('/attendance')
            ]);

            if (usersResponse.status === 'success') {
                this.generateUserReports(usersResponse.data.users);
            }

            if (tasksResponse.status === 'success') {
                this.generateTaskReports(tasksResponse.data.tasks);
            }

            if (requestsResponse.status === 'success') {
                this.generateRequestReports(requestsResponse.data.requests);
            }

            if (attendanceResponse.status === 'success') {
                this.generateAttendanceReports(attendanceResponse.data.attendance);
            }

        } catch (error) {
            console.error('Error loading reports:', error);
        }
    }

    generateUserReports(users) {
        const deptDistribution = {};
        const roleDistribution = {};
        
        users.forEach(user => {
            if (user.isActive) {
                deptDistribution[user.department] = (deptDistribution[user.department] || 0) + 1;
                roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
            }
        });

        document.getElementById('userChart').innerHTML = `
            <h4>Users by Department</h4>
            ${Object.entries(deptDistribution).map(([dept, count]) => `
                <div class="chart-bar">
                    <div class="bar-label">${dept}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${(count / users.length) * 100}%"></div>
                    </div>
                    <div class="bar-value">${count}</div>
                </div>
            `).join('')}
        `;

        document.getElementById('deptChart').innerHTML = `
            <h4>Users by Role</h4>
            ${Object.entries(roleDistribution).map(([role, count]) => `
                <div class="chart-bar">
                    <div class="bar-label">${role}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${(count / users.length) * 100}%"></div>
                    </div>
                    <div class="bar-value">${count}</div>
                </div>
            `).join('')}
        `;
    }

    generateTaskReports(tasks) {
        const taskStats = tasks.reduce((stats, task) => {
            stats[task.status] = (stats[task.status] || 0) + 1;
            return stats;
        }, {});

        document.getElementById('taskChart').innerHTML = `
            <h4>Tasks by Status</h4>
            ${Object.entries(taskStats).map(([status, count]) => `
                <div class="chart-bar">
                    <div class="bar-label">${status}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${(count / tasks.length) * 100}%"></div>
                    </div>
                    <div class="bar-value">${count}</div>
                </div>
            `).join('')}
        `;
    }

    generateRequestReports(requests) {
        const requestStats = requests.reduce((stats, request) => {
            stats[request.status] = (stats[request.status] || 0) + 1;
            return stats;
        }, {});

        document.getElementById('requestChart').innerHTML = `
            <h4>Requests by Status</h4>
            ${Object.entries(requestStats).map(([status, count]) => `
                <div class="chart-bar">
                    <div class="bar-label">${status}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${(count / requests.length) * 100}%"></div>
                    </div>
                    <div class="bar-value">${count}</div>
                </div>
            `).join('')}
        `;
    }

    generateAttendanceReports(attendance) {
        const attendanceStats = attendance.reduce((stats, record) => {
            stats[record.status] = (stats[record.status] || 0) + 1;
            return stats;
        }, {});

        document.getElementById('attendanceChart').innerHTML = `
            <h4>Attendance by Status</h4>
            ${Object.entries(attendanceStats).map(([status, count]) => `
                <div class="chart-bar">
                    <div class="bar-label">${status}</div>
                    <div class="bar-container">
                        <div class="bar-fill" style="width: ${(count / attendance.length) * 100}%"></div>
                    </div>
                    <div class="bar-value">${count}</div>
                </div>
            `).join('')}
        `;
    }

    // SETTINGS
    async saveCompanySettings() {
        const companyName = document.getElementById('companyName').value;
        
        try {
            // Save to localStorage for demo purposes
            localStorage.setItem('companyName', companyName);
            this.showNotification('Company settings updated successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Error saving settings', 'error');
        }
    }

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
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (element) {
            element.innerHTML = `
                <tr><td colspan="8" style="text-align: center; padding: 2rem;">
                    <div>⏳ Loading...</div>
                </td></tr>
            `;
        }
    }

    showError(selector, message) {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
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
const admin = new AdminDashboard();