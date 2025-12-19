const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Data file paths
const DATA_DIR = path.join(__dirname, '../data');
const CASES_FILE = path.join(DATA_DIR, 'cases.json');
const EVIDENCE_FILE = path.join(DATA_DIR, 'evidence.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
(async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Initialize files if they don't exist
    const files = [
      { file: CASES_FILE, default: [] },
      { file: EVIDENCE_FILE, default: [] },
      { file: USERS_FILE, default: [] }
    ];
    
    for (const { file, default: defaultValue } of files) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, JSON.stringify(defaultValue, null, 2));
      }
    }
  } catch (error) {
    console.error('Error initializing data files:', error);
  }
})();

// Helper function to read data
async function readData(file) {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${file}:`, error);
    return [];
  }
}

// Helper function to write data
async function writeData(file, data) {
  try {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${file}:`, error);
    return false;
  }
}

// Auth middleware (simplified for demo)
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AI Harm Watch API',
    version: '1.0.0'
  });
});

// Get all cases
router.get('/cases', async (req, res) => {
  try {
    const cases = await readData(CASES_FILE);
    const { category, status, limit = 20, page = 1 } = req.query;
    
    let filteredCases = [...cases];
    
    // Filter by category
    if (category) {
      filteredCases = filteredCases.filter(c => c.category === category);
    }
    
    // Filter by status
    if (status) {
      filteredCases = filteredCases.filter(c => c.status === status);
    }
    
    // Sort by date (newest first)
    filteredCases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginatedCases = filteredCases.slice(start, end);
    
    res.json({
      success: true,
      data: paginatedCases,
      pagination: {
        total: filteredCases.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredCases.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch cases' 
    });
  }
});

// Get single case
router.get('/cases/:id', async (req, res) => {
  try {
    const cases = await readData(CASES_FILE);
    const evidence = await readData(EVIDENCE_FILE);
    
    const caseId = req.params.id;
    const caseItem = cases.find(c => c.id === caseId);
    
    if (!caseItem) {
      return res.status(404).json({ 
        success: false, 
        error: 'Case not found' 
      });
    }
    
    // Get related evidence
    const caseEvidence = evidence.filter(e => e.caseId === caseId);
    
    res.json({
      success: true,
      data: {
        ...caseItem,
        evidence: caseEvidence
      }
    });
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch case' 
    });
  }
});

// Create new case
router.post('/cases', authenticate, async (req, res) => {
  try {
    const cases = await readData(CASES_FILE);
    
    const newCase = {
      id: uuidv4(),
      title: req.body.title,
      description: req.body.description,
      detailedDescription: req.body.detailedDescription || '',
      category: req.body.category,
      severity: req.body.severity || 'medium',
      aiSystem: req.body.aiSystem || '',
      company: req.body.company || '',
      country: req.body.country || '',
      status: 'pending',
      views: 0,
      upvotes: 0,
      evidenceCount: 0,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Validate required fields
    if (!newCase.title || !newCase.description || !newCase.category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title, description, and category are required' 
      });
    }
    
    cases.push(newCase);
    const success = await writeData(CASES_FILE, cases);
    
    if (success) {
      res.status(201).json({
        success: true,
        data: newCase,
        message: 'Case submitted successfully'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save case' 
      });
    }
  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create case' 
    });
  }
});

// Update case (partial update)
router.patch('/cases/:id', authenticate, async (req, res) => {
  try {
    const cases = await readData(CASES_FILE);
    const caseIndex = cases.findIndex(c => c.id === req.params.id);
    
    if (caseIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Case not found' 
      });
    }
    
    // Check permissions (only creator or admin can edit)
    if (cases[caseIndex].createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'Not authorized' 
      });
    }
    
    // Update allowed fields
    const allowedUpdates = ['status', 'severity', 'description', 'detailedDescription'];
    const updates = req.body;
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        cases[caseIndex][field] = updates[field];
      }
    });
    
    cases[caseIndex].updatedAt = new Date().toISOString();
    
    const success = await writeData(CASES_FILE, cases);
    
    if (success) {
      res.json({
        success: true,
        data: cases[caseIndex],
        message: 'Case updated successfully'
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to update case' 
      });
    }
  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update case' 
    });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const cases = await readData(CASES_FILE);
    const evidence = await readData(EVIDENCE_FILE);
    const users = await readData(USERS_FILE);
    
    // Calculate category distribution
    const categoryDistribution = cases.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate status distribution
    const statusDistribution = cases.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate severity distribution
    const severityDistribution = cases.reduce((acc, c) => {
      acc[c.severity] = (acc[c.severity] || 0) + 1;
      return acc;
    }, {});
    
    // Get recent cases
    const recentCases = [...cases]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    res.json({
      success: true,
      data: {
        totalCases: cases.length,
        totalEvidence: evidence.length,
        totalUsers: users.length,
        verifiedCases: cases.filter(c => c.status === 'verified').length,
        pendingCases: cases.filter(c => c.status === 'pending').length,
        categoryDistribution,
        statusDistribution,
        severityDistribution,
        recentCases
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

// User registration
router.post('/auth/register', async (req, res) => {
  try {
    const users = await readData(USERS_FILE);
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username, email, and password are required' 
      });
    }
    
    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newUser = {
      id: uuidv4(),
      username,
      email,
      passwordHash,
      role: 'viewer',
      contributionScore: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    const success = await writeData(USERS_FILE, users);
    
    if (!success) {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create user' 
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to register user' 
    });
  }
});

// User login
router.post('/auth/login', async (req, res) => {
  try {
    const users = await readData(USERS_FILE);
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and password are required' 
      });
    }
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to login' 
    });
  }
});

// Get current user profile
router.get('/auth/me', authenticate, async (req, res) => {
  try {
    const users = await readData(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Remove password hash from response
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user profile' 
    });
  }
});

module.exports = router;
