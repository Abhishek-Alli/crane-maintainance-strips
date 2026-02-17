const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_name || user.role,
      user_type: user.user_type || 'CRANE_MAINTENANCE'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Get user from database
   const result = await query(
  `SELECT
    u.id,
    u.username,
    u.is_active,
    u.department_id,
    u.user_type,
    COALESCE(r.name::text, u.role::text) AS role_name,
    r.permissions
  FROM public.users u
  LEFT JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = $1`,
  [decoded.id]
);


    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'User account is disabled'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 * Can be called as authorize(['ADMIN', 'SUPER_ADMIN']) or authorize('ADMIN', 'SUPER_ADMIN')
 */
const authorize = (rolesOrFirstRole, ...moreRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Handle both array and spread arguments
    const allowedRoles = Array.isArray(rolesOrFirstRole)
      ? rolesOrFirstRole
      : [rolesOrFirstRole, ...moreRoles];

    if (!allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Check if user has permission
 */
const hasPermission = (user, permission) => {
  if (!user || !user.permissions) {
    return false;
  }

  const permissions = user.permissions;

  // Super admin has all permissions
  if (permissions.all === true) {
    return true;
  }

  // Check specific permission
  return permissions[permission] === true;
};

/**
 * Check if user has access to shed
 */
const canAccessShed = async (userId, shedId) => {
  const result = await query(
    'SELECT id FROM user_shed_access WHERE user_id = $1 AND shed_id = $2',
    [userId, shedId]
  );
  return result.rows.length > 0;
};

/**
 * Check if user has access to crane
 */
const canAccessCrane = async (userId, craneId) => {
  const result = await query(
    'SELECT id FROM user_crane_access WHERE user_id = $1 AND crane_id = $2',
    [userId, craneId]
  );
  return result.rows.length > 0;
};

/**
 * Middleware: Check shed access
 * Note: All authenticated users can now access any shed/department
 */
const checkShedAccess = async (req, res, next) => {
  try {
    // All authenticated users can access any shed for inspections
    // This supports the requirement that any user can inspect any department
    if (req.user) {
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  } catch (error) {
    console.error('Shed access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check shed access',
      error: error.message
    });
  }
};

/**
 * Middleware: Check crane access
 * Note: All authenticated users can now inspect any crane/department
 */
const checkCraneAccess = async (req, res, next) => {
  try {
    // All authenticated users can access any crane for inspections
    // This supports the requirement that any user can inspect any department
    if (req.user) {
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  } catch (error) {
    console.error('Crane access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check crane access',
      error: error.message
    });
  }
};

/**
 * Middleware: Require HBM user type
 * Blocks users who are not ADMIN or HBM_CHECKSHEETS
 */
const requireHBM = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const userType = req.user.user_type || 'CRANE_MAINTENANCE';
  if (userType !== 'ADMIN' && userType !== 'HBM_CHECKSHEETS') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. HBM Checksheets module access required.'
    });
  }

  next();
};

/**
 * Middleware: Require Crane Maintenance user type
 * Blocks users who are not ADMIN or CRANE_MAINTENANCE
 */
const requireCraneMaintenance = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const userType = req.user.user_type || 'CRANE_MAINTENANCE';
  if (userType !== 'ADMIN' && userType !== 'CRANE_MAINTENANCE') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Crane Maintenance module access required.'
    });
  }

  next();
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  hasPermission,
  canAccessShed,
  canAccessCrane,
  checkShedAccess,
  checkCraneAccess,
  requireHBM,
  requireCraneMaintenance
};
