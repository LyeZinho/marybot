import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SERVICE_TOKENS = {
  backend: process.env.BACKEND_SERVICE_TOKEN || 'backend-service-token',
  admin: process.env.ADMIN_SERVICE_TOKEN || 'admin-service-token'
};

export function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization header missing'
      });
    }

    const token = authHeader.split(' ')[1]; // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token missing'
      });
    }

    // Check if it's a service token first
    const serviceType = Object.entries(SERVICE_TOKENS).find(([, serviceToken]) => serviceToken === token);
    
    if (serviceType) {
      req.service = serviceType[0];
      req.isServiceAuth = true;
      return next();
    }

    // If not a service token, verify JWT
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.isServiceAuth = false;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication error'
    });
  }
}

// Middleware to check if request is from a specific service
export function requireService(serviceName) {
  return (req, res, next) => {
    if (!req.isServiceAuth || req.service !== serviceName) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access restricted to ${serviceName} service`
      });
    }
    next();
  };
}

// Generate JWT token for admin users
export function generateUserToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verify service token
export function verifyServiceToken(token, serviceName) {
  return SERVICE_TOKENS[serviceName] === token;
}