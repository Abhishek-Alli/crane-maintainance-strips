const { query, transaction } = require('../config/database');

class UserController {
  /**
   * Create a new user (Admin only)
   * POST /api/users/create
   *
   * Body: {
   *   username: string (unique),
   *   password: string (plain text),
   *   role: 'ADMIN' | 'OPERATOR',
   *   is_active: boolean (default: true)
   * }
   */
  static async createUser(req, res) {
    try {
      const { username, password, role, user_type, is_active } = req.body;

      // Validation
      if (!username || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'Username, password, and role are required'
        });
      }

      if (!['ADMIN', 'OPERATOR'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be ADMIN or OPERATOR'
        });
      }

      const validUserTypes = ['ADMIN', 'CRANE_MAINTENANCE', 'HBM_CHECKSHEETS'];
      const effectiveUserType = user_type && validUserTypes.includes(user_type)
        ? user_type
        : (role === 'ADMIN' ? 'ADMIN' : 'CRANE_MAINTENANCE');

      // Check if username already exists
      const existingUser = await query(
        'SELECT id FROM users WHERE username = $1',
        [username.trim()]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }

      // Create user
      const userResult = await query(
        `INSERT INTO users (username, password, role, user_type, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, role, user_type, is_active, created_at`,
        [
          username.trim(),
          password,
          role,
          effectiveUserType,
          is_active !== false ? true : false
        ]
      );

      const newUser = userResult.rows[0];

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role,
          user_type: newUser.user_type,
          is_active: newUser.is_active,
          created_at: newUser.created_at
        }
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  }

  /**
   * Get all users with their assigned departments
   * GET /api/users
   */
  static async getAll(req, res) {
    try {
      const result = await query(
        `SELECT
          u.id,
          u.username,
          u.role,
          u.user_type,
          u.is_active,
          u.created_at,
          u.last_login,
          COALESCE(
            json_agg(
              json_build_object('id', d.id, 'name', d.name)
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'
          ) as departments
         FROM users u
         LEFT JOIN user_departments ud ON u.id = ud.user_id
         LEFT JOIN departments d ON ud.department_id = d.id AND d.is_active = true
         GROUP BY u.id
         ORDER BY u.created_at DESC`
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
  }

  /**
   * Get user by ID with assigned departments
   * GET /api/users/:id
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await query(
        `SELECT
          u.id,
          u.username,
          u.role,
          u.is_active,
          u.created_at,
          u.last_login,
          COALESCE(
            json_agg(
              json_build_object('id', d.id, 'name', d.name)
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'
          ) as departments
         FROM users u
         LEFT JOIN user_departments ud ON u.id = ud.user_id
         LEFT JOIN departments d ON ud.department_id = d.id AND d.is_active = true
         WHERE u.id = $1
         GROUP BY u.id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user'
      });
    }
  }

  /**
   * Update user (Admin only)
   * PUT /api/users/:id
   *
   * Body: {
   *   password?: string,
   *   role?: 'ADMIN' | 'OPERATOR',
   *   department_ids?: integer[],
   *   is_active?: boolean
   * }
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { password, role, department_ids, is_active } = req.body;

      // Check if user exists
      const userCheck = await query('SELECT id FROM users WHERE id = $1', [id]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Build dynamic update query for user table
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (password !== undefined) {
        updates.push(`password = $${paramCount++}`);
        values.push(password);
      }

      if (role !== undefined) {
        if (!['ADMIN', 'OPERATOR'].includes(role)) {
          return res.status(400).json({
            success: false,
            message: 'Role must be ADMIN or OPERATOR'
          });
        }
        updates.push(`role = $${paramCount++}`);
        values.push(role);
      }

      if (is_active !== undefined) {
        updates.push(`is_active = $${paramCount++}`);
        values.push(is_active);
      }

      // Handle department updates
      if (department_ids !== undefined) {
        if (!Array.isArray(department_ids) || department_ids.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'At least one department must be selected'
          });
        }

        // Verify all departments exist
        const deptResult = await query(
          'SELECT id, name FROM departments WHERE id = ANY($1) AND is_active = true',
          [department_ids]
        );

        if (deptResult.rows.length !== department_ids.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more invalid or inactive departments'
          });
        }

        // Update department_id for backward compatibility
        updates.push(`department_id = $${paramCount++}`);
        values.push(department_ids[0]);
      }

      if (updates.length === 0 && department_ids === undefined) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      // Execute updates in transaction
      await transaction(async (client) => {
        // Update user fields if any
        if (updates.length > 0) {
          values.push(id);
          await client.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
            values
          );
        }

        // Update department assignments if provided
        if (department_ids !== undefined) {
          // Remove old assignments
          await client.query('DELETE FROM user_departments WHERE user_id = $1', [id]);

          // Add new assignments
          for (const deptId of department_ids) {
            await client.query(
              'INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2)',
              [id, deptId]
            );
          }
        }
      });

      // Fetch updated user data
      const updatedUser = await query(
        `SELECT
          u.id,
          u.username,
          u.role,
          u.is_active,
          COALESCE(
            json_agg(
              json_build_object('id', d.id, 'name', d.name)
            ) FILTER (WHERE d.id IS NOT NULL),
            '[]'
          ) as departments
         FROM users u
         LEFT JOIN user_departments ud ON u.id = ud.user_id
         LEFT JOIN departments d ON ud.department_id = d.id
         WHERE u.id = $1
         GROUP BY u.id`,
        [id]
      );

      res.json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser.rows[0]
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  }

  /**
   * Delete user (Admin only)
   * DELETE /api/users/:id
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const result = await query(
        'DELETE FROM users WHERE id = $1 RETURNING id, username',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
        data: result.rows[0]
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  }
}

module.exports = UserController;
