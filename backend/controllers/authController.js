const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');

class AuthController {
  /**
   * User login with username + password only
   * POST /api/auth/login
   *
   * Body: {
   *   username: string,
   *   password: string (plain text)
   * }
   *
   * Note: Users can inspect any department after login
   */
  static async login(req, res) {
    try {
      const { username, password, userType } = req.body;

      // Validation
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      if (!userType) {
        return res.status(400).json({
          success: false,
          message: 'Please select a login type'
        });
      }

      const validUserTypes = ['ADMIN', 'CRANE_MAINTENANCE', 'HBM_CHECKSHEETS'];
      if (!validUserTypes.includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid login type'
        });
      }

      // 1. Fetch user data
      const result = await query(
        `SELECT
          u.id,
          u.username,
          u.password,
          u.role,
          u.user_type,
          u.is_active
         FROM users u
         WHERE u.username = $1 AND u.is_active = true`,
        [username.trim()]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      const user = result.rows[0];

      // 2. Validate password (plain text comparison)
      if (user.password !== password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }

      // 3. Validate user_type matches
      // ADMIN user_type can access any module
      if (user.user_type !== 'ADMIN' && user.user_type !== userType) {
        return res.status(403).json({
          success: false,
          message: `You are not authorized for ${userType.replace(/_/g, ' ')} module. Your account is registered for ${(user.user_type || 'CRANE_MAINTENANCE').replace(/_/g, ' ')}.`
        });
      }

      // 4. Fetch user's assigned departments (for crane maintenance)
      const deptResult = await query(
        `SELECT d.id, d.name
         FROM user_departments ud
         JOIN departments d ON ud.department_id = d.id
         WHERE ud.user_id = $1 AND d.is_active = true`,
        [user.id]
      );

      const departments = deptResult.rows;

      // 5. SUCCESS - Generate token and return user data
      const effectiveUserType = user.user_type || 'CRANE_MAINTENANCE';
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role,
        user_type: effectiveUserType
      });

      // Update last login timestamp
      await query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            user_type: effectiveUserType,
            loginType: userType,
            departments: departments
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal Server Error'
      });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  static async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AuthController;