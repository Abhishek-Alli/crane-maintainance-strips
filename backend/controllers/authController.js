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
      const { username, password } = req.body;

      // Validation
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // 1. Fetch user data
      const result = await query(
        `SELECT
          u.id,
          u.username,
          u.password,
          u.role,
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

      // 3. Fetch user's assigned departments
      const deptResult = await query(
        `SELECT d.id, d.name
         FROM user_departments ud
         JOIN departments d ON ud.department_id = d.id
         WHERE ud.user_id = $1 AND d.is_active = true`,
        [user.id]
      );

      const departments = deptResult.rows;

      // 4. SUCCESS - Generate token and return user data
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role
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