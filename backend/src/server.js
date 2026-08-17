const path = require('path');
const os = require('os');
const dotenv = require('dotenv');
const dotenvResult = dotenv.config({ path: path.resolve(__dirname, '../.env') });
if (dotenvResult.error) {
  console.warn('No .env loaded from', path.resolve(__dirname, '../.env'), '-', dotenvResult.error && dotenvResult.error.message ? dotenvResult.error.message : dotenvResult.error);
} else {
  console.log('injected env (' + (dotenvResult.parsed ? Object.keys(dotenvResult.parsed).length : 0) + ") from " + path.resolve(__dirname, '../.env'));
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const getLocalIPs = () => {
  const ips = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      const family = typeof net.family === 'string' ? net.family : `IPv${net.family}`;
      if (family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
};

const getClientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  req.ip ||
  'unknown';

const isVercel = !!process.env.VERCEL;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Set it in backend/.env or Vercel Environment Variables.');
  if (!isVercel) process.exit(1);
}

const app = express();

// Middleware
app.set('trust proxy', true);
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${getClientIp(req)} ${req.method} ${req.originalUrl}`);
  next();
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create Default Admin
const Admin = require('./models/Admin');
const createDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      const admin = new Admin({
        email: process.env.ADMIN_EMAIL,
        passwordHash,
        name: 'Super Admin'
      });
      await admin.save();
      console.log('✅ Default Admin Created');
      console.log(`📧 Email: ${process.env.ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD}`);
    }
  } catch (error) {
    console.error('❌ Admin Creation Error:', error);
  }
};

// Database Connection (cached for Vercel serverless)
let dbReady = null;
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (dbReady) return dbReady;

  dbReady = (async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB Connected');
      await createDefaultAdmin();
      return mongoose.connection;
    } catch (error) {
      dbReady = null;
      console.error('❌ MongoDB Connection Error:', error);
      console.warn('Continuing without DB connection; some features may be unavailable.');
      throw error;
    }
  })();

  return dbReady;
};

app.use(async (req, res, next) => {
  if (!process.env.MONGODB_URI) return next();
  try {
    await connectDB();
  } catch (error) {
    // allow health/docs without DB
  }
  next();
});

// Import Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admins');
const bankAccountRoutes = require('./routes/bankAccounts');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use(
  '/api/docs',
  ...swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'USDT Payment API Docs',
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true,
      filter: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2
    }
  })
);
app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Local server only — Vercel uses api/index.js serverless export
if (!isVercel) {
  const PORT = parseInt(process.env.PORT, 10) || 4000;
  const HOST = process.env.HOST || '0.0.0.0';
  const srv = app.listen(PORT, HOST, () => {
    const lanIps = getLocalIPs();
    swaggerSpec.servers = [
      { url: `http://localhost:${PORT}`, description: 'Local' },
      { url: `http://127.0.0.1:${PORT}`, description: 'Loopback' },
      ...lanIps.map((ip) => ({ url: `http://${ip}:${PORT}`, description: 'Network' }))
    ];
    console.log('');
    console.log(`🚀 Server running`);
    console.log(`   Bind:    ${HOST}:${PORT}`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Local:   http://127.0.0.1:${PORT}`);
    if (lanIps.length) {
      lanIps.forEach((ip) => {
        console.log(`   Network: http://${ip}:${PORT}`);
      });
    } else {
      console.log('   Network: unavailable');
    }
    console.log(`📘 Swagger`);
    console.log(`   Local:   http://localhost:${PORT}/api/docs`);
    lanIps.forEach((ip) => {
      console.log(`   Network: http://${ip}:${PORT}/api/docs`);
    });
    console.log(`🖥️  Admin panel`);
    console.log('   Local:   http://localhost:5173');
    console.log('   Local:   http://localhost:5173/login');
    lanIps.forEach((ip) => {
      console.log(`   Network: http://${ip}:5173`);
      console.log(`   Network: http://${ip}:5173/login`);
    });
    console.log(`👤 User portal`);
    console.log('   Local:   http://localhost:5173/portal/login');
    lanIps.forEach((ip) => {
      console.log(`   Network: http://${ip}:5173/portal/login`);
    });
    console.log('');
  });

  srv.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set PORT in backend/.env to a free port.`);
      process.exit(1);
    }
    console.error('Server error:', err);
    process.exit(1);
  });

  connectDB().catch(() => {});
} else if (process.env.MONGODB_URI) {
  connectDB().catch(() => {});
}

module.exports = app;