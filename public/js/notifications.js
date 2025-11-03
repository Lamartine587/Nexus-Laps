class NotificationSystem {
    constructor() {
        this.socket = null;
        this.notificationCount = 0;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.init();
    }

    init() {
        this.setupUI();
        this.connectWebSocket();
        this.requestNotificationPermission();
        this.setupServiceWorker();
    }

    setupUI() {
        // Create notification container if it doesn't exist
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // Create notification bell if it doesn't exist
        this.createNotificationBell();
    }

    createNotificationBell() {
        // Add to admin header
        const headerRight = document.querySelector('.header-right');
        if (headerRight && !document.getElementById('notification-bell')) {
            const notificationBell = document.createElement('div');
            notificationBell.id = 'notification-bell';
            notificationBell.className = 'notification-bell';
            notificationBell.innerHTML = `
                <button id="notificationButton" class="notification-button">
                    <span class="bell-icon">🔔</span>
                    <span id="notificationBadge" class="notification-badge hidden">0</span>
                </button>
                <div id="notificationDropdown" class="notification-dropdown hidden">
                    <div class="notification-header">
                        <h4>Notifications</h4>
                        <button id="markAllRead" class="btn-link">Mark all read</button>
                    </div>
                    <div id="notificationList" class="notification-list">
                        <div class="notification-empty">No new notifications</div>
                    </div>
                    <div class="notification-footer">
                        <a href="#" id="viewAllNotifications">View All</a>
                    </div>
                </div>
            `;
            
            // Insert before logout button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                headerRight.insertBefore(notificationBell, logoutBtn);
            } else {
                headerRight.appendChild(notificationBell);
            }

            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Notification bell click
        document.getElementById('notificationButton')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Mark all as read
        document.getElementById('markAllRead')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.markAllAsRead();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            this.hideDropdown();
        });

        // Prevent dropdown close when clicking inside
        document.getElementById('notificationDropdown')?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                console.log('🔌 WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                
                // Subscribe to user-specific notifications
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                if (user.id) {
                    this.socket.send(JSON.stringify({
                        type: 'subscribe',
                        userId: user.id
                    }));
                }
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.socket.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.attemptReconnect();
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnected = false;
                this.updateConnectionStatus(false);
            };
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.attemptReconnect();
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, delay);
        } else {
            console.error('❌ Max reconnection attempts reached');
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'notification':
                this.showNotification(data);
                break;
            case 'connected':
                console.log('✅ WebSocket:', data.message);
                break;
            case 'pong':
                // Handle pong response
                break;
            default:
                console.log('📨 Unknown WebSocket message type:', data.type);
        }
    }

    showNotification(notification) {
        // Update badge count
        this.notificationCount++;
        this.updateBadge();
        
        // Show browser notification
        this.showBrowserNotification(notification);
        
        // Add to dropdown list
        this.addToDropdown(notification);
        
        // Show in-page toast
        this.showToast(notification);
    }

    showBrowserNotification(notification) {
        if (Notification.permission === 'granted') {
            const browserNotification = new Notification(notification.title || 'Nexus ERP', {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification.id || Date.now().toString(),
                requireInteraction: false
            });
            
            browserNotification.onclick = () => {
                window.focus();
                this.handleNotificationClick(notification);
                browserNotification.close();
            };
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                browserNotification.close();
            }, 5000);
        }
    }

    showToast(notification) {
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${notification.type || 'info'}`;
        toast.innerHTML = `
            <div class="toast-header">
                <strong>${notification.title || 'Notification'}</strong>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-body">${notification.message}</div>
            <div class="toast-time">${new Date().toLocaleTimeString()}</div>
        `;
        
        const container = document.getElementById('notification-container');
        container.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // Click to handle
        toast.addEventListener('click', () => {
            this.handleNotificationClick(notification);
            toast.remove();
        });
    }

    addToDropdown(notification) {
        const notificationList = document.getElementById('notificationList');
        const emptyMessage = notificationList.querySelector('.notification-empty');
        
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        const notificationItem = document.createElement('div');
        notificationItem.className = `notification-item notification-${notification.type || 'info'} unread`;
        notificationItem.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${notification.title || 'Notification'}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${new Date(notification.timestamp).toLocaleTimeString()}</div>
            </div>
            <button class="notification-dismiss">&times;</button>
        `;
        
        notificationItem.querySelector('.notification-dismiss').addEventListener('click', (e) => {
            e.stopPropagation();
            notificationItem.remove();
            this.notificationCount = Math.max(0, this.notificationCount - 1);
            this.updateBadge();
            this.checkEmptyList();
        });
        
        notificationItem.addEventListener('click', () => {
            this.handleNotificationClick(notification);
            notificationItem.classList.remove('unread');
        });
        
        notificationList.insertBefore(notificationItem, notificationList.firstChild);
        
        // Limit to 10 notifications
        const items = notificationList.querySelectorAll('.notification-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }

    handleNotificationClick(notification) {
        // Handle notification click based on type
        switch (notification.action) {
            case 'task_assigned':
                if (window.admin) {
                    window.admin.showPage('tasks');
                } else if (window.employee) {
                    window.employee.showPage('tasks');
                }
                break;
            case 'request_approved':
            case 'request_rejected':
                if (window.admin) {
                    window.admin.showPage('requests');
                } else if (window.employee) {
                    window.employee.showPage('requests');
                }
                break;
            case 'attendance_reminder':
                if (window.employee) {
                    window.employee.showPage('attendance');
                }
                break;
            default:
                // Default behavior - just close notification
                console.log('Notification clicked:', notification);
        }
        
        // Mark as read
        this.notificationCount = Math.max(0, this.notificationCount - 1);
        this.updateBadge();
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.notificationCount > 0) {
                badge.textContent = this.notificationCount > 99 ? '99+' : this.notificationCount.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    updateConnectionStatus(connected) {
        const bell = document.getElementById('notificationButton');
        if (bell) {
            if (connected) {
                bell.classList.remove('disconnected');
                bell.classList.add('connected');
            } else {
                bell.classList.remove('connected');
                bell.classList.add('disconnected');
            }
        }
    }

    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    }

    hideDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
    }

    markAllAsRead() {
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
            item.classList.remove('unread');
        });
        
        this.notificationCount = 0;
        this.updateBadge();
        this.checkEmptyList();
    }

    checkEmptyList() {
        const notificationList = document.getElementById('notificationList');
        const items = notificationList.querySelectorAll('.notification-item');
        
        if (items.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'notification-empty';
            emptyMessage.textContent = 'No new notifications';
            notificationList.appendChild(emptyMessage);
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            try {
                await Notification.requestPermission();
            } catch (error) {
                console.error('Error requesting notification permission:', error);
            }
        }
    }

    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                });
        }
    }

    // Send test notification
    sendTestNotification() {
        if (this.socket && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'test',
                message: 'Test notification from client'
            }));
        }
    }

    // Cleanup
    destroy() {
        if (this.socket) {
            this.socket.close();
        }
    }
}

// Initialize notification system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.notificationSystem = new NotificationSystem();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}