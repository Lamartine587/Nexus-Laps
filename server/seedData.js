const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');
const Request = require('./models/Request');
const Document = require('./models/Document');
const Department = require('./models/Department');
require('dotenv').config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB for seeding');

        // Get existing users
        const users = await User.find();
        console.log(`👥 Found ${users.length} users in database`);
        
        if (users.length === 0) {
            console.log('❌ No users found. Please create users first.');
            return;
        }

        const admin = users.find(u => u.role === 'admin');
        const employees = users.filter(u => u.role === 'employee');

        console.log(`👑 Admin users: ${admin ? 1 : 0}`);
        console.log(`👤 Employee users: ${employees.length}`);

        if (employees.length === 0) {
            console.log('❌ No employees found. Please create employee users first.');
            return;
        }

        // Create departments if they don't exist
        console.log('🏢 Checking/creating departments...');
        const departments = ['HR', 'Finance', 'Sales', 'IT', 'Operations'];
        
        for (const deptName of departments) {
            let dept = await Department.findOne({ name: deptName });
            if (!dept) {
                dept = await Department.create({
                    name: deptName,
                    description: `${deptName} Department`
                });
                console.log(`✅ Created department: ${deptName}`);
            }
        }

        // Group employees by department for easier task assignment
        const employeesByDept = {};
        departments.forEach(dept => {
            employeesByDept[dept] = employees.filter(emp => emp.department === dept);
        });

        console.log('📊 Employees by department:', Object.keys(employeesByDept).reduce((acc, dept) => {
            acc[dept] = employeesByDept[dept].length;
            return acc;
        }, {}));

        // Seed Tasks
        const taskCount = await Task.countDocuments();
        if (taskCount === 0) {
            console.log('📋 Seeding tasks...');
            
            const tasks = [];
            const taskTemplates = [
                {
                    title: 'Review employee onboarding documents',
                    description: 'Check and verify all new employee documents for completeness',
                    department: 'HR',
                    status: 'todo',
                    priority: 'high',
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    estimatedHours: 4,
                    tags: ['onboarding', 'documents', 'verification']
                },
                {
                    title: 'Process payroll for current month',
                    description: 'Calculate and process payroll for all employees',
                    department: 'HR',
                    status: 'progress',
                    priority: 'high',
                    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    estimatedHours: 8,
                    tags: ['payroll', 'finance', 'monthly']
                },
                {
                    title: 'Prepare monthly financial reports',
                    description: 'Generate financial reports for management review',
                    department: 'Finance',
                    status: 'progress',
                    priority: 'high',
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                    estimatedHours: 6,
                    tags: ['reports', 'finance', 'monthly']
                },
                {
                    title: 'Follow up with potential clients',
                    description: 'Contact potential clients from last quarter',
                    department: 'Sales',
                    status: 'todo',
                    priority: 'medium',
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    estimatedHours: 5,
                    tags: ['clients', 'follow-up', 'sales']
                },
                {
                    title: 'Resolve support ticket #4521',
                    description: 'User reported login issues with the new system',
                    department: 'IT',
                    status: 'progress',
                    priority: 'high',
                    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                    estimatedHours: 2,
                    tags: ['support', 'login', 'urgent']
                },
                {
                    title: 'Update employee handbook',
                    description: 'Add new policies to the employee handbook',
                    department: 'HR',
                    status: 'completed',
                    priority: 'medium',
                    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    estimatedHours: 3,
                    actualHours: 2.5,
                    tags: ['handbook', 'policies', 'update']
                },
                {
                    title: 'Optimize workflow processes',
                    description: 'Identify and implement process improvements',
                    department: 'Operations',
                    status: 'todo',
                    priority: 'medium',
                    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                    estimatedHours: 6,
                    tags: ['optimization', 'process', 'efficiency']
                },
                {
                    title: 'Coordinate with vendors',
                    description: 'Manage relationships with key suppliers',
                    department: 'Operations',
                    status: 'progress',
                    priority: 'high',
                    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    estimatedHours: 4,
                    tags: ['vendors', 'suppliers', 'coordination']
                }
            ];

            for (const template of taskTemplates) {
                const deptEmployees = employeesByDept[template.department];
                if (deptEmployees && deptEmployees.length > 0) {
                    // Assign to a random employee in the department
                    const randomEmployee = deptEmployees[Math.floor(Math.random() * deptEmployees.length)];
                    
                    tasks.push({
                        ...template,
                        assignedTo: randomEmployee._id,
                        assignedBy: admin ? admin._id : employees[0]._id // Fallback to first employee if no admin
                    });
                } else {
                    console.log(`⚠️ No employees found in ${template.department} department for task: ${template.title}`);
                    // Assign to any employee as fallback
                    const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
                    tasks.push({
                        ...template,
                        assignedTo: randomEmployee._id,
                        assignedBy: admin ? admin._id : employees[0]._id
                    });
                }
            }

            if (tasks.length > 0) {
                await Task.insertMany(tasks);
                console.log(`✅ ${tasks.length} tasks seeded successfully`);
            } else {
                console.log('⚠️ No tasks were created');
            }
        } else {
            console.log('📋 Tasks already exist, skipping...');
        }

        // Seed Requests
        const requestCount = await Request.countDocuments();
        if (requestCount === 0) {
            console.log('📋 Seeding requests...');
            
            const requests = [];
            const requestTemplates = [
                {
                    type: 'leave',
                    subject: 'Annual vacation leave',
                    description: 'Requesting 5 days of annual leave for family vacation',
                    department: employees[0].department,
                    leaveType: 'vacation',
                    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                    endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
                    totalDays: 5,
                    status: 'pending',
                    priority: 'medium'
                },
                {
                    type: 'expense',
                    subject: 'Business travel expenses',
                    description: 'Expenses for client meeting in Nairobi',
                    department: employees[1] ? employees[1].department : employees[0].department,
                    expenseAmount: 12500,
                    expenseCategory: 'travel',
                    status: 'approved',
                    priority: 'medium'
                },
                {
                    type: 'support',
                    subject: 'Software installation request',
                    description: 'Need Adobe Creative Suite installed on my workstation',
                    department: employees[2] ? employees[2].department : employees[0].department,
                    supportCategory: 'software',
                    urgency: 'medium',
                    status: 'in-review',
                    priority: 'medium'
                },
                {
                    type: 'leave',
                    subject: 'Sick leave',
                    description: 'Medical appointment and recovery',
                    department: employees[0].department,
                    leaveType: 'sick',
                    startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                    totalDays: 2,
                    status: 'pending',
                    priority: 'high'
                }
            ];

            for (let i = 0; i < Math.min(requestTemplates.length, employees.length); i++) {
                requests.push({
                    ...requestTemplates[i],
                    submittedBy: employees[i]._id
                });
            }

            if (requests.length > 0) {
                await Request.insertMany(requests);
                console.log(`✅ ${requests.length} requests seeded successfully`);
            } else {
                console.log('⚠️ No requests were created');
            }
        } else {
            console.log('📋 Requests already exist, skipping...');
        }

        // Seed Documents
        const documentCount = await Document.countDocuments();
        if (documentCount === 0) {
            console.log('📄 Seeding documents...');
            
            const documents = [
                {
                    title: 'Employee Handbook 2024',
                    description: 'Complete employee handbook with company policies and procedures',
                    category: 'policy',
                    department: 'All',
                    accessLevel: 'public',
                    tags: ['handbook', 'policies', 'procedures'],
                    uploadedBy: admin ? admin._id : employees[0]._id
                },
                {
                    title: 'Expense Claim Form',
                    description: 'Standard form for submitting business expense claims',
                    category: 'form',
                    department: 'All',
                    accessLevel: 'public',
                    tags: ['expense', 'form', 'finance'],
                    uploadedBy: admin ? admin._id : employees[0]._id
                },
                {
                    title: 'HR Department Procedures',
                    description: 'Internal procedures and guidelines for HR department',
                    category: 'guide',
                    department: 'HR',
                    accessLevel: 'department',
                    tags: ['hr', 'procedures', 'internal'],
                    uploadedBy: admin ? admin._id : employees[0]._id
                },
                {
                    title: 'Sales Performance Report Template',
                    description: 'Template for monthly sales performance reports',
                    category: 'template',
                    department: 'Sales',
                    accessLevel: 'department',
                    tags: ['sales', 'template', 'reports'],
                    uploadedBy: admin ? admin._id : employees[0]._id
                },
                {
                    title: 'IT Support Guidelines',
                    description: 'Guidelines for submitting and tracking IT support requests',
                    category: 'guide',
                    department: 'IT',
                    accessLevel: 'department',
                    tags: ['it', 'support', 'guidelines'],
                    uploadedBy: admin ? admin._id : employees[0]._id
                },
                {
                    title: 'Operations Manual',
                    description: 'Standard operating procedures for daily operations',
                    category: 'guide',
                    department: 'Operations',
                    accessLevel: 'department',
                    tags: ['operations', 'manual', 'procedures'],
                    uploadedBy: admin ? admin._id : employees[0]._id
                },
                {
                    title: 'Financial Policy Document',
                    description: 'Company financial policies and approval guidelines',
                    category: 'policy',
                    department: 'Finance',
                    accessLevel: 'department',
                    tags: ['finance', 'policy', 'guidelines'],
                    uploadedBy: admin ? admin._id : employees[0]._id
                }
            ];

            await Document.insertMany(documents);
            console.log(`✅ ${documents.length} documents seeded successfully`);
        } else {
            console.log('📄 Documents already exist, skipping...');
        }

        console.log('🎉 Seed data process completed!');
        console.log('\n📊 Summary of seeded data:');
        console.log(`   - Tasks: ${await Task.countDocuments()}`);
        console.log(`   - Requests: ${await Request.countDocuments()}`);
        console.log(`   - Documents: ${await Document.countDocuments()}`);
        console.log(`   - Departments: ${await Department.countDocuments()}`);
        
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

// Check if this script is being run directly
if (require.main === module) {
    seedData();
}

module.exports = seedData;
