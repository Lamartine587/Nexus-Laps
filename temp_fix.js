    // Action Methods
    async checkIn() {
        try {
            console.log('🕒 Attempting check-in...');
            const response = await this.apiCall('/attendance/checkin', 'POST');
            
            if (response.status === 'success') {
                alert('✅ Checked in successfully at ' + new Date().toLocaleTimeString());
                this.loadDashboardData();
            } else {
                alert('❌ Check-in failed: ' + response.message);
            }
        } catch (error) {
            console.error('Error checking in:', error);
            // Provide more user-friendly error messages
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
                alert(`✅ Checked out successfully at ${checkoutTime}\\nTotal hours worked today: ${hoursWorked} hours`);
                this.loadDashboardData();
            } else {
                alert('❌ Check-out failed: ' + response.message);
            }
        } catch (error) {
            console.error('Error checking out:', error);
            // Provide more user-friendly error messages
            if (error.message.includes('No check-in record')) {
                alert('ℹ️ You need to check in first before checking out.');
            } else if (error.message.includes('Already checked out')) {
                alert('ℹ️ You have already checked out today.');
            } else {
                alert('⚠️ Check-out service is temporarily unavailable. Please try again later.');
            }
        }
    }
