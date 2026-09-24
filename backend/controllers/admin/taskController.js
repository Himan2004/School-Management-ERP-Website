import Task from "../../models/modules/Task.js";

const parsePagination = (req) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

export const createTask = async (req, res) => {
  try {
    const schoolId = req.user?.school || req.user?._id;
    const { title, description, status, priority, dueDate, assignedTo } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required',
      });
    }

    const task = await Task.create({
      school: schoolId,
      title,
      description,
      status: status || 'pending',
      priority: priority || 'medium',
      dueDate,
      assignedTo: assignedTo || 'Admin',
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllTasks = async (req, res) => {
  try {
    const schoolId = req.user?.school || req.user?._id;
    const { status, priority, search } = req.query;
    const { page, limit, skip } = parsePagination(req);

    const query = { school: schoolId };
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(query).sort({ dueDate: 1, createdAt: -1 }).skip(skip).limit(limit),
      Task.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: tasks,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateTask = async (req, res) => {
  try {
    const schoolId = req.user?.school || req.user?._id;
    const { id } = req.params;

    const task = await Task.findOneAndUpdate(
      { _id: id, school: schoolId },
      { ...req.body },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const schoolId = req.user?.school || req.user?._id;
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
