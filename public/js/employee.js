const API_BASE = 'http://localhost:5000/api';

class EmployeeDashboard {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');
        this.profile = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadDashboardData();
        this.showPage('dashboard');
        this.setupDepartmentTheme();
    }

    checkAuth() {
        if (!this.token) {
            window.location.href = '/';
            return;
        }
        
        // Update UI with user info
        document.getElementById('userName').textContent = `${this.user.firstName} ${this.user.lastName}`;
        document.getElementById('userPosition').textContent = this.user.position;
        document.getElementById('employeeName').textContent = this.user.firstName;
        document.getElementById('departmentBadge').textContent = this.user.department;
    }

    setupDepartmentTheme() {
        // Add department-specific class to body for styling
        const department = this.user.department?.toLowerCase() || '';
        document.body.classList.add(`department-${department}`);
        
        // Show department-specific content
        this.showDepartmentContent();
    }

    showDepartmentContent() {
        // Hide all department content first
        document.querySelectorAll('.dept-content').forEach(content => {
            content.style.display = 'none';
        });

        // Show content for user's department
        const deptContent = document.getElementById(`${this.user.department?.toLowerCase()}-content`);
        if (deptContent) {
            deptContent.style.display = 'block';
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.showPage(page);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/';
        });

        // Attendance month filter
        document.getElementById('attendanceMonth')?.addEventListener('change', (e) => {
            this.loadAttendance(e.target.value);
        });

        // Request modal
        document.getElementById('requestForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRequest();
        });

        // Request type change
        document.getElementById('requestType')?.addEventListener('change', () => {
            this.toggleRequestFields();
        });

        // Close modals
        document.querySelectorAll('.close, .cancel-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Profile edit form
        document.getElementById('profileEditForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile();
        });

        // Document search
        document.getElementById('documentSearch')?.addEventListener('input', (e) => {
            this.searchDocuments(e.target.value);
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
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'attendance':
                this.loadAttendance();
                break;
            case 'profile':
                this.loadProfile();
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
        }
    }

    async loadDashboardData() {
        try {
            console.log('📊 Loading employee dashboard data...');
            
            // Load profile, attendance, and tasks in parallel
            const [profileResponse, attendanceResponse, tasksResponse] = await Promise.all([
                this.apiCall('/employeeProfile/my-profile'),
                this.apiCall('/attendance/my-attendance'),
                this.apiCall('/tasks/my-tasks')
            ]);

            if (profileResponse.status === 'success') {
                this.profile = profileResponse.data.profile;
            }

            if (attendanceResponse.status === 'success') {
                this.updateAttendanceStats(attendanceResponse.data.attendance);
            }

            if (tasksResponse.status === 'success') {
                this.updateTaskStats(tasksResponse.data.tasks);
            }

            // For requests, we'll use mock data since no API exists
            this.updateRequestStats([]);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    updateAttendanceStats(attendanceData) {
        if (!attendanceData || attendanceData.length === 0) {
            document.getElementById('daysWorked').textContent = '0';
            document.getElementById('avgHours').textContent = '0';
            return;
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthAttendance = attendanceData.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
        });

        const daysPresent = monthAttendance.filter(record => record.status === 'present').length;
        const totalHours = monthAttendance.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
        const avgPerDay = daysPresent > 0 ? (totalHours / daysPresent).toFixed(1) : 0;
        
        document.getElementById('daysWorked').textContent = daysPresent;
        document.getElementById('avgHours').textContent = avgPerDay;
    }

    updateTaskStats(tasks) {
        if (!tasks) return;

        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        const pendingTasks = tasks.filter(task => task.status === 'pending' || task.status === 'todo' || task.status === 'progress').length;
        
        document.getElementById('tasksCompleted').textContent = completedTasks;
        document.getElementById('pendingRequests').textContent = pendingTasks;
    }

    updateRequestStats(requests) {
        // Mock data for requests since no API exists
        const pendingRequests = requests.filter(req => req.status === 'pending').length;
        document.getElementById('pendingRequests').textContent = pendingRequests;
    }

    async loadProfile() {
        try {
            const response = await this.apiCall('/employeeProfile/my-profile');
            
            if (response.status === 'success') {
                this.profile = response.data.profile;
                this.updateProfileUI();
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    updateProfileUI() {
        if (!this.profile) return;

        const user = this.profile.user || this.user;
        const profile = this.profile;

        // Personal Information
        document.getElementById('profileEmployeeId').textContent = user.employeeId || 'Not assigned';
        document.getElementById('profileFullName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileDepartment').textContent = user.department;
        document.getElementById('profilePosition').textContent = user.position;
        document.getElementById('profileJoinDate').textContent = user.createdAt ? 
            new Date(user.createdAt).toLocaleDateString() : 'Not available';

        // Contact Information
        document.getElementById('profilePhone').textContent = profile.phone || 'Not set';
        
        const address = profile.address || {};
        const addressText = address.street ? 
            `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}` : 
            'Not set';
        document.getElementById('profileAddress').textContent = addressText;

        const emergencyContact = profile.emergencyContact || {};
        const emergencyText = emergencyContact.name ?
            `${emergencyContact.name} (${emergencyContact.relationship}) - ${emergencyContact.phone}` :
            'Not set';
        document.getElementById('profileEmergencyContact').textContent = emergencyText;

        // Employment Details
        const employment = profile.employmentDetails || {};
        document.getElementById('profileEmploymentType').textContent = employment.employmentType || 'Not set';
        document.getElementById('profileSalary').textContent = employment.salary ? 
            `$${employment.salary.toLocaleString()}` : 'Not set';
        
        const bankAccount = employment.bankAccount || {};
        document.getElementById('profileBankAccount').textContent = bankAccount.accountNumber ?
            `${bankAccount.bankName} - ${bankAccount.accountNumber}` : 'Not set';
    }

    async updateProfile() {
        try {
            const form = document.getElementById('profileEditForm');
            const formData = new FormData(form);
            
            const profileData = {
                phone: formData.get('phone'),
                address: {
                    street: formData.get('street'),
                    city: formData.get('city'),
                    state: formData.get('state'),
                    zipCode: formData.get('zipCode'),
                    country: formData.get('country')
                },
                emergencyContact: {
                    name: formData.get('emergencyName'),
                    relationship: formData.get('emergencyRelationship'),
                    phone: formData.get('emergencyPhone')
                }
            };

            const response = await this.apiCall('/employeeProfile/my-profile', 'PATCH', profileData);
            
            if (response.status === 'success') {
                alert('Profile updated successfully!');
                this.hideModal('editProfileModal');
                this.loadProfile();
            } else {
                alert('Error updating profile: ' + response.message);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile');
        }
    }

    showEditProfileModal() {
        if (!this.profile) return;

        // Populate form with current data
        const address = this.profile.address || {};
        const emergencyContact = this.profile.emergencyContact || {};

        document.getElementById('editPhone').value = this.profile.phone || '';
        document.getElementById('editStreet').value = address.street || '';
        document.getElementById('editCity').value = address.city || '';
        document.getElementById('editState').value = address.state || '';
        document.getElementById('editZipCode').value = address.zipCode || '';
        document.getElementById('editCountry').value = address.country || '';
        document.getElementById('editEmergencyName').value = emergencyContact.name || '';
        document.getElementById('editEmergencyRelationship').value = emergencyContact.relationship || '';
        document.getElementById('editEmergencyPhone').value = emergencyContact.phone || '';

        this.showModal('editProfileModal');
    }

    async loadAttendance(month = null) {
        try {
            const today = new Date();
            const targetMonth = month || today.toISOString().substring(0, 7);
            
            // Set the month filter
            document.getElementById('attendanceMonth').value = targetMonth;

            const [year, monthNum] = targetMonth.split('-');
            const response = await this.apiCall(`/attendance/my-attendance?month=${monthNum}&year=${year}`);
            
            if (response.status === 'success') {
                this.updateAttendanceTable(response.data.attendance);
                this.updateAttendanceSummary(response.data.attendance);
            }
        } catch (error) {
            console.error('Error loading attendance:', error);
        }
    }

    updateAttendanceSummary(attendanceData) {
        if (!attendanceData || attendanceData.length === 0) {
            document.getElementById('daysPresent').textContent = '0';
            document.getElementById('totalHours').textContent = '0';
            document.getElementById('avgPerDay').textContent = '0';
            return;
        }

        const daysPresent = attendanceData.filter(record => record.status === 'present').length;
        const totalHours = attendanceData.reduce((sum, record) => sum + (record.hoursWorked || 0), 0);
        const avgPerDay = daysPresent > 0 ? (totalHours / daysPresent).toFixed(1) : 0;
        
        document.getElementById('daysPresent').textContent = daysPresent;
        document.getElementById('totalHours').textContent = totalHours.toFixed(1);
        document.getElementById('avgPerDay').textContent = avgPerDay;
    }

    updateAttendanceTable(attendanceData) {
        const tbody = document.getElementById('attendanceTableBody');
        
        if (attendanceData && attendanceData.length > 0) {
            tbody.innerHTML = attendanceData.map(record => `
                <tr>
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td>${record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'Not recorded'}</td>
                    <td>${record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Not recorded'}</td>
                    <td>${record.hoursWorked ? record.hoursWorked.toFixed(1) + ' hrs' : 'N/A'}</td>
                    <td>
                        <span class="status-badge ${record.status === 'present' ? 'status-active' : 
                                                  record.status === 'half-day' ? 'status-pending' : 'status-inactive'}">
                            ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">
                        No attendance records found for selected period
                    </td>
                </tr>
            `;
        }
    }

    async loadTasks() {
        try {
            const response = await this.apiCall('/tasks/my-tasks');
            
            if (response.status === 'success') {
                this.updateTasksUI(response.data.tasks);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    updateTasksUI(tasks) {
        const todoList = document.getElementById('todoTasks');
        const progressList = document.getElementById('progressTasks');
        const completedList = document.getElementById('completedTasks');

        if (!tasks || tasks.length === 0) {
            const emptyMessage = '<div style="text-align: center; padding: 1rem; color: #666;">No tasks assigned</div>';
            todoList.innerHTML = emptyMessage;
            progressList.innerHTML = emptyMessage;
            completedList.innerHTML = emptyMessage;
            return;
        }

        const todoTasks = tasks.filter(task => task.status === 'todo');
        const progressTasks = tasks.filter(task => task.status === 'progress');
        const completedTasks = tasks.filter(task => task.status === 'completed');

        todoList.innerHTML = todoTasks.map(task => `
            <div class="task-item">
                <strong>${task.title}</strong>
                <p class="task-description">${task.description || 'No description'}</p>
                <div class="task-meta">
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    <span class="task-due">Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-primary" onclick="employee.updateTaskStatus('${task._id}', 'progress')">Start Task</button>
                </div>
            </div>
        `).join('') || '<div style="text-align: center; padding: 1rem; color: #666;">No tasks</div>';

        progressList.innerHTML = progressTasks.map(task => `
            <div class="task-item">
                <strong>${task.title}</strong>
                <p class="task-description">${task.description || 'No description'}</p>
                <div class="task-meta">
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    <span class="task-due">Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                </div>
                <div class="task-actions">
                    <button class="btn-primary" onclick="employee.updateTaskStatus('${task._id}', 'completed')">Complete</button>
                    <button class="btn-secondary" onclick="employee.showTaskComments('${task._id}')">Comments</button>
                </div>
            </div>
        `).join('') || '<div style="text-align: center; padding: 1rem; color: #666;">No tasks</div>';

        completedList.innerHTML = completedTasks.map(task => `
            <div class="task-item">
                <strong>${task.title}</strong>
                <p class="task-description">${task.description || 'No description'}</p>
                <div class="task-meta">
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                    <span class="task-hours">Hours: ${task.actualHours || 'N/A'}</span>
                </div>
                <div class="task-actions">
                    <span class="status-badge status-active">Completed</span>
                </div>
            </div>
        `).join('') || '<div style="text-align: center; padding: 1rem; color: #666;">No tasks</div>';
    }

    async updateTaskStatus(taskId, status) {
        try {
            const actualHours = status === 'completed' ? 
                prompt('Enter actual hours spent on this task:') : null;

            const response = await this.apiCall(`/tasks/${taskId}/status`, 'PATCH', {
                status,
                actualHours: actualHours ? parseFloat(actualHours) : undefined
            });

            if (response.status === 'success') {
                alert('Task status updated successfully!');
                this.loadTasks();
            } else {
                alert('Error updating task: ' + response.message);
            }
        } catch (error) {
            console.error('Error updating task:', error);
            alert('Error updating task status');
        }
    }

    async showTaskComments(taskId) {
        const comment = prompt('Add a comment to this task:');
        if (comment) {
            try {
                const response = await this.apiCall(`/tasks/${taskId}/comments`, 'POST', {
                    text: comment
                });

                if (response.status === 'success') {
                    alert('Comment added successfully!');
                } else {
                    alert('Error adding comment: ' + response.message);
                }
            } catch (error) {
                console.error('Error adding comment:', error);
                alert('Error adding comment');
            }
        }
    }

    async checkIn() {
        try {
            console.log('🕒 Attempting check-in...');
            const response = await this.apiCall('/attendance/checkin', 'POST');
            
            if (response.status === 'success') {
                alert('✅ Checked in successfully at ' + new Date().toLocaleTimeString());
                this.loadDashboardData();
                this.loadAttendance();
            } else {
                alert('❌ Check-in failed: ' + response.message);
            }
        } catch (error) {
            console.error('Error checking in:', error);
            if (error.message.includes('Already checked in')) {
                alert('ℹ️ You have already checked in today.');
            } else {
                alert('⚠️ Check-in service is temporarily unavailable. Please try again later.');
            }
        }
    }

    async checkOut() {
        try {
            console.log('🕒 Attempting check-out...');
            const response = await this.apiCall('/attendance/checkout', 'POST');
            
            if (response.status === 'success') {
                const checkoutTime = new Date().toLocaleTimeString();
                const hoursWorked = response.data.attendance.hoursWorked;
                alert(`✅ Checked out successfully at ${checkoutTime}\nTotal hours worked today: ${hoursWorked} hours`);
                this.loadDashboardData();
                this.loadAttendance();
            } else {
                alert('❌ Check-out failed: ' + response.message);
            }
        } catch (error) {
            console.error('Error checking out:', error);
            if (error.message.includes('No check-in record')) {
                alert('ℹ️ You need to check in first before checking out.');
            } else if (error.message.includes('Already checked out')) {
                alert('ℹ️ You have already checked out today.');
            } else {
                alert('⚠️ Check-out service is temporarily unavailable. Please try again later.');
            }
        }
    }

    // The rest of your methods for requests, documents, etc. remain the same
    async loadRequests() {
        try {
            // Since we don't have a requests API, we'll use mock data
            const mockRequests = this.generateMockRequests();
            this.updateRequestsUI(mockRequests);
        } catch (error) {
            console.error('Error loading requests:', error);
        }
    }

    generateMockRequests() {
        return [
            {
                _id: '1',
                requestId: 'REQ-001',
                type: 'leave',
                subject: 'Annual Leave Request',
                description: 'Request for annual leave for family vacation',
                status: 'pending',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                leaveType: 'vacation',
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                totalDays: 7
            },
            {
                _id: '2',
                requestId: 'REQ-002',
                type: 'expense',
                subject: 'Business Travel Expenses',
                description: 'Expenses for client meeting in New York',
                status: 'approved',
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                expenseAmount: 1250.50,
                expenseCategory: 'travel'
            }
        ];
    }

    updateRequestsUI(requests) {
        const tbody = document.getElementById('requestsTableBody');
        
        if (requests && requests.length > 0) {
            tbody.innerHTML = requests.map(request => `
                <tr>
                    <td>${request.requestId}</td>
                    <td>
                        <strong>${request.type.toUpperCase()} - ${request.subject}</strong>
                        <br><small>${request.description.substring(0, 50)}...</small>
                    </td>
                    <td>${new Date(request.createdAt).toLocaleDateString()}</td>
                    <td>
                        <span class="status-badge ${request.status === 'approved' ? 'status-active' : 
                                                  request.status === 'rejected' ? 'status-inactive' : 
                                                  request.status === 'in-review' ? 'status-pending' : 'status-pending'}">
                            ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-secondary" onclick="employee.viewRequestDetails('${request._id}')">View</button>
                        ${request.status === 'pending' ? 
                            `<button class="btn-secondary" onclick="employee.cancelRequest('${request._id}')">Cancel</button>` : 
                            ''
                        }
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem;">
                        No requests found
                    </td>
                </tr>
            `;
        }
    }

    // Toggle request fields based on type
    toggleRequestFields() {
        const requestType = document.getElementById('requestType').value;
        
        // Hide all fields first
        document.getElementById('leaveFields').style.display = 'none';
        document.getElementById('expenseFields').style.display = 'none';
        document.getElementById('supportFields').style.display = 'none';
        
        // Show relevant fields
        if (requestType === 'leave') {
            document.getElementById('leaveFields').style.display = 'block';
        } else if (requestType === 'expense') {
            document.getElementById('expenseFields').style.display = 'block';
        } else if (requestType === 'support') {
            document.getElementById('supportFields').style.display = 'block';
        }
    }

    showRequestModal() {
        // Reset form and hide all type-specific fields
        document.getElementById('requestForm').reset();
        document.getElementById('leaveFields').style.display = 'none';
        document.getElementById('expenseFields').style.display = 'none';
        document.getElementById('supportFields').style.display = 'none';
        this.showModal('requestModal');
    }

    async submitRequest() {
        try {
            const form = document.getElementById('requestForm');
            const formData = new FormData(form);
            
            const requestType = formData.get('requestType');
            const requestData = {
                type: requestType,
                subject: formData.get('subject'),
                description: formData.get('description'),
                priority: formData.get('priority')
            };

            // Add type-specific fields
            if (requestType === 'leave') {
                requestData.leaveType = formData.get('leaveType');
                requestData.startDate = formData.get('startDate');
                requestData.endDate = formData.get('endDate');
                
                const start = new Date(requestData.startDate);
                const end = new Date(requestData.endDate);
                const diffTime = Math.abs(end - start);
                requestData.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            } else if (requestType === 'expense') {
                requestData.expenseAmount = parseFloat(formData.get('expenseAmount'));
                requestData.expenseCategory = formData.get('expenseCategory');
            } else if (requestType === 'support') {
                requestData.supportCategory = formData.get('supportCategory');
                requestData.urgency = formData.get('urgency');
            }

            // Since we don't have a requests API, we'll simulate submission
            alert('Request submitted successfully! (Simulated - No backend API)');
            this.hideModal('requestModal');
            this.loadRequests();
            this.loadDashboardData(); // Refresh dashboard stats
            
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Error submitting request');
        }
    }

    async viewRequestDetails(requestId) {
        // Since we don't have a requests API, we'll use mock data
        const requests = this.generateMockRequests();
        const request = requests.find(req => req._id === requestId);
        
        if (request) {
            let details = `Request ID: ${request.requestId}\n`;
            details += `Type: ${request.type}\n`;
            details += `Subject: ${request.subject}\n`;
            details += `Description: ${request.description}\n`;
            details += `Status: ${request.status}\n`;
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
        }
    }

    async cancelRequest(requestId) {
        if (confirm('Are you sure you want to cancel this request?')) {
            // Since we don't have a requests API, we'll simulate cancellation
            alert('Request cancelled successfully! (Simulated - No backend API)');
            this.loadRequests();
            this.loadDashboardData(); // Refresh dashboard stats
        }
    }

    async loadDocuments() {
        try {
            // Since we don't have a documents API, we'll use mock data
            const mockDocuments = this.generateMockDocuments();
            this.updateDocumentsUI(mockDocuments);
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    }

    generateMockDocuments() {
        return [
            {
                _id: '1',
                title: 'Employee Handbook 2024',
                description: 'Complete guide to company policies and procedures',
                category: 'Policy',
                department: 'All',
                downloadCount: 45
            },
            {
                _id: '2',
                title: 'Expense Report Form',
                description: 'Template for submitting business expense reports',
                category: 'Finance',
                department: 'All',
                downloadCount: 23
            }
        ];
    }

    updateDocumentsUI(documents) {
        const grid = document.querySelector('.documents-grid');
        
        if (documents && documents.length > 0) {
            grid.innerHTML = documents.map(doc => `
                <div class="document-card">
                    <h4>${doc.title}</h4>
                    <p>${doc.description || 'No description available'}</p>
                    <div class="document-meta">
                        <span class="doc-category">${doc.category}</span>
                        <span class="doc-department">${doc.department}</span>
                        <span class="doc-downloads">${doc.downloadCount} downloads</span>
                    </div>
                    <div class="document-actions">
                        <button class="btn-primary" onclick="employee.downloadDocument('${doc._id}', '${doc.title}')">
                            Download
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <div>📄</div>
                    <div>No documents available</div>
                </div>
            `;
        }
    }

    async downloadDocument(docId, docTitle) {
        try {
            // Since we don't have a documents API, we'll simulate download
            alert(`Downloading: ${docTitle}\n\nDocument download functionality would be implemented with a proper backend API.`);
            
            // Refresh documents to update download count (in a real app)
            this.loadDocuments();
        } catch (error) {
            console.error('Error downloading document:', error);
            alert('Error downloading document');
        }
    }

    async searchDocuments(query) {
        try {
            // Since we don't have a search API, we'll filter mock data
            const mockDocuments = this.generateMockDocuments();
            const filteredDocs = mockDocuments.filter(doc => 
                doc.title.toLowerCase().includes(query.toLowerCase()) ||
                doc.description.toLowerCase().includes(query.toLowerCase()) ||
                doc.category.toLowerCase().includes(query.toLowerCase())
            );
            this.updateDocumentsUI(filteredDocs);
        } catch (error) {
            console.error('Error searching documents:', error);
        }
    }

    // Modal management
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    editProfile() {
        this.showEditProfileModal();
    }

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

            console.log(`🌐 Employee API Call: ${method} ${endpoint}`, data);
            const response = await fetch(`${API_BASE}${endpoint}`, options);
            
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = '/';
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`🌐 Employee API Response: ${endpoint}`, result);
            return result;
        } catch (error) {
            console.error(`🌐 Employee API Error: ${endpoint}`, error);
            throw error;
        }
    }
}

// Initialize the employee dashboard when the page loads
const employee = new EmployeeDashboard();