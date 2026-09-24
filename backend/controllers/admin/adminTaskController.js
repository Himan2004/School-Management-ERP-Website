import Task from "../../models/modules/Task.js";

const parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
    return { page, limit, skip: (page - 1) * limit };
};

// Helper function to get progress percentage from status
const getProgressFromStatus = (status) => {
    switch (status) {
        case 'completed':
            return 100;
        case 'in-progress':
            return 50;
        case 'pending':
            return 0;
        default:
            return 0;
    }
};

// Helper function to get avatar color based on name
const getAvatarColor = (name) => {
    const colors = [
        'bg-indigo-500',
        'bg-emerald-500',
        'bg-rose-500',
        'bg-amber-500',
        'bg-sky-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-teal-500',
    ];
    const index = name?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index] || 'bg-indigo-500';
};

// Helper function to format task for frontend
const formatTaskForFrontend = (task) => {
    return {
        id: task._id,
        title: task.title,
        description: task.description || '',
        assignedUser: {
            name: task.assignedTo || 'Admin User',
            avatar: (task.assignedTo || 'Admin').charAt(0).toUpperCase(),
            color: getAvatarColor(task.assignedTo || 'Admin'),
        },
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        priority: task.priority,
        status: task.status,
        progress: getProgressFromStatus(task.status),
        tags: task.tags || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignedClass: task.assignedClass || '',
        assignedSection: task.assignedSection || '',
        assignedSubject: task.assignedSubject || '',
        attachment: task.attachment || '',
        createdBy: task.createdBy || null,
    };
};

/**
 * @desc    Create a new task
 * @route   POST /api/admin/tasks
 * @access  Private (Admin)
 */
export const createAdminTask = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school || req.body.schoolId;
        const createdBy = req.user?._id;
        
        const { title, description, status, priority, dueDate, assignedTo, assignedClass, assignedSection, assignedSubject, attachment } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Task title is required',
            });
        }

        if (!dueDate) {
            return res.status(400).json({
                success: false,
                message: 'Due date is required',
            });
        }

        const task = await Task.create({
            school: schoolId,
            title,
            description: description || '',
            status: status || 'pending',
            priority: priority || 'medium',
            dueDate: new Date(dueDate),
            assignedTo: assignedTo || 'Admin',
            createdBy,
            assignedClass,
            assignedSection,
            assignedSubject,
            attachment,
        });

        const formattedTask = formatTaskForFrontend(task);

        return res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: formattedTask,
        });
    } catch (error) {
        console.error('Error in createAdminTask:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Get all tasks with filters
 * @route   GET /api/admin/tasks
 * @access  Private (Admin)
 */
export const getAllAdminTasks = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school;
        const { status, priority, search, assignedTo, startDate, endDate } = req.query;
        const { page, limit, skip } = parsePagination(req);

        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'School ID is required',
            });
        }

        const query = { school: schoolId };

        // Apply filters
        if (status && status !== 'all') query.status = status;
        if (priority && priority !== 'all') query.priority = priority;
        if (assignedTo && assignedTo !== 'all') {
            query.assignedTo = { $regex: assignedTo, $options: 'i' };
        }
        
        // Date range filter
        if (startDate || endDate) {
            query.dueDate = {};
            if (startDate) query.dueDate.$gte = new Date(startDate);
            if (endDate) query.dueDate.$lte = new Date(endDate);
        }

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { assignedTo: { $regex: search, $options: 'i' } },
            ];
        }

        const [tasks, total] = await Promise.all([
            Task.find(query)
                .sort({ dueDate: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Task.countDocuments(query),
        ]);

        // Calculate statistics
        const stats = {
            total: await Task.countDocuments({ school: schoolId }),
            completed: await Task.countDocuments({ school: schoolId, status: 'completed' }),
            pending: await Task.countDocuments({ school: schoolId, status: 'pending' }),
            inProgress: await Task.countDocuments({ school: schoolId, status: 'in-progress' }),
            overdue: await Task.countDocuments({
                school: schoolId,
                status: { $ne: 'completed' },
                dueDate: { $lt: new Date() },
            }),
        };

        const formattedTasks = tasks.map(formatTaskForFrontend);

        return res.status(200).json({
            success: true,
            data: {
                tasks: formattedTasks,
                stats,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Error in getAllAdminTasks:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Get single task by ID
 * @route   GET /api/admin/tasks/:id
 * @access  Private (Admin)
 */
export const getAdminTaskById = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school;
        const { id } = req.params;

        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'School ID is required',
            });
        }

        const task = await Task.findOne({ _id: id, school: schoolId }).lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        const formattedTask = formatTaskForFrontend(task);

        return res.status(200).json({
            success: true,
            data: formattedTask,
        });
    } catch (error) {
        console.error('Error in getAdminTaskById:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Update a task
 * @route   PUT /api/admin/tasks/:id
 * @access  Private (Admin)
 */
export const updateAdminTask = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school;
        const { id } = req.params;
        const updateData = { ...req.body };

        // Convert dueDate if provided
        if (updateData.dueDate) {
            updateData.dueDate = new Date(updateData.dueDate);
        }

        const task = await Task.findOneAndUpdate(
            { _id: id, school: schoolId },
            updateData,
            { new: true, runValidators: true }
        ).lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        const formattedTask = formatTaskForFrontend(task);

        return res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: formattedTask,
        });
    } catch (error) {
        console.error('Error in updateAdminTask:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Delete a task
 * @route   DELETE /api/admin/tasks/:id
 * @access  Private (Admin)
 */
export const deleteAdminTask = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school;
        const { id } = req.params;

        const task = await Task.findOneAndDelete({ _id: id, school: schoolId });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Task deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleteAdminTask:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Update task status only (for quick status changes)
 * @route   PATCH /api/admin/tasks/:id/status
 * @access  Private (Admin)
 */
export const updateAdminTaskStatus = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school;
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['pending', 'in-progress', 'completed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required (pending, in-progress, completed)',
            });
        }

        const task = await Task.findOneAndUpdate(
            { _id: id, school: schoolId },
            { status },
            { new: true }
        ).lean();

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: `Task status updated to ${status}`,
            data: {
                id: task._id,
                status: task.status,
                progress: getProgressFromStatus(task.status),
            },
        });
    } catch (error) {
        console.error('Error in updateAdminTaskStatus:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Get task statistics
 * @route   GET /api/admin/tasks/stats
 * @access  Private (Admin)
 */
export const getAdminTaskStats = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school;

        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'School ID is required',
            });
        }

        const stats = {
            total: await Task.countDocuments({ school: schoolId }),
            completed: await Task.countDocuments({ school: schoolId, status: 'completed' }),
            pending: await Task.countDocuments({ school: schoolId, status: 'pending' }),
            inProgress: await Task.countDocuments({ school: schoolId, status: 'in-progress' }),
            overdue: await Task.countDocuments({
                school: schoolId,
                status: { $ne: 'completed' },
                dueDate: { $lt: new Date() },
            }),
        };

        return res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error in getAdminTaskStats:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Bulk delete tasks
 * @route   DELETE /api/admin/tasks/bulk
 * @access  Private (Admin)
 */
export const bulkDeleteAdminTasks = async (req, res) => {
    try {
        const schoolId = req.user?.school || req.admin?.school;
        const { taskIds } = req.body;

        if (!schoolId) {
            return res.status(400).json({
                success: false,
                message: 'School ID is required',
            });
        }

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Task IDs are required',
            });
        }

        const result = await Task.deleteMany({
            _id: { $in: taskIds },
            school: schoolId,
        });

        return res.status(200).json({
            success: true,
            message: `${result.deletedCount} task(s) deleted successfully`,
            data: { deletedCount: result.deletedCount },
        });
    } catch (error) {
        console.error('Error in bulkDeleteAdminTasks:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};