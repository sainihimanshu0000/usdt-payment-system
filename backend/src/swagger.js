const errorResponse = (description) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { error: description }
    }
  }
});

const jsonContent = (schema, example) => ({
  'application/json': {
    schema,
    ...(example ? { example } : {})
  }
});

const jsonBody = (schema, example, required = true, description) => ({
  required,
  description,
  content: jsonContent(schema, example)
});

const authHeader = [{ $ref: '#/components/parameters/Authorization' }];
const idAndAuth = [
  { $ref: '#/components/parameters/Id' },
  { $ref: '#/components/parameters/Authorization' }
];

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'USDT Payment System API',
    version: '1.0.0',
    description: [
      'REST API for admin management and user USDT deposits.',
      '',
      '**How to use**',
      '1. Call `POST /api/auth/admin/login` or `POST /api/auth/user/login`.',
      '2. Click **Authorize** and paste `Bearer <token>`.',
      '3. Try protected endpoints.',
      '',
      'Default admin: `admin@apex.com` / `Apex@123`'
    ].join('\n')
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local' }],
  tags: [
    { name: 'Health', description: 'Service status' },
    { name: 'Auth', description: 'Login and token verification' },
    { name: 'Users', description: 'User accounts' },
    { name: 'Payments', description: 'USDT deposits, settings, and approvals' },
    { name: 'Admins', description: 'Admin accounts' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    parameters: {
      Authorization: {
        name: 'Authorization',
        in: 'header',
        required: true,
        description: 'JWT access token. Format: `Bearer <token>`',
        schema: {
          type: 'string'
        },
        example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      },
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'MongoDB ObjectId',
        schema: {
          type: 'string',
          pattern: '^[a-fA-F0-9]{24}$'
        },
        example: '64f1a2b3c4d5e6f7a8b9c0d1'
      },
      PaymentStatus: {
        name: 'status',
        in: 'query',
        required: false,
        description: 'Filter payments by status',
        schema: {
          type: 'string',
          enum: ['all', 'pending', 'verified', 'approved', 'rejected'],
          default: 'all'
        }
      },
      Page: {
        name: 'page',
        in: 'query',
        required: false,
        description: 'Page number',
        schema: { type: 'integer', minimum: 1, default: 1 },
        example: 1
      },
      Limit: {
        name: 'limit',
        in: 'query',
        required: false,
        description: 'Items per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        example: 20
      }
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Invalid credentials' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@apex.com', description: 'Account email' },
          password: { type: 'string', example: 'Apex@123', description: 'Account password' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT to send as Bearer token' },
          user: { $ref: '#/components/schemas/AuthUser' }
        }
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d1' },
          email: { type: 'string', example: 'admin@apex.com' },
          name: { type: 'string', example: 'Super Admin' },
          role: { type: 'string', enum: ['admin', 'user'] },
          balance: { type: 'number', example: 0 }
        }
      },
      VerifyResponse: {
        type: 'object',
        properties: {
          valid: { type: 'boolean', example: true },
          user: { $ref: '#/components/schemas/AuthUser' }
        }
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d1' },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', example: 'john@example.com' },
          status: { type: 'string', enum: ['active', 'disabled'], example: 'active' },
          balance: { type: 'number', example: 150.5 },
          totalDeposited: { type: 'number', example: 150.5 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateUserRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', minLength: 6, example: 'User@123' }
        }
      },
      UpdateUserRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          password: { type: 'string', description: 'Leave empty to keep current password', example: 'NewPass@123' }
        }
      },
      UserStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'disabled'], example: 'disabled' }
        }
      },
      MessageResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'User created successfully' }
        }
      },
      PaymentSetting: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          network: { type: 'string', enum: ['TRC20', 'ERC20', 'BEP20'], example: 'TRC20' },
          walletAddress: { type: 'string', example: 'TXYZabcdefghijklmnopqrstuvwx' },
          qrImage: { type: 'string', example: 'https://example.com/qr.png' },
          active: { type: 'boolean', example: true },
          minAmount: { type: 'number', example: 10 },
          maxAmount: { type: 'number', example: 10000 }
        }
      },
      UpdateSettingsRequest: {
        type: 'object',
        properties: {
          network: { type: 'string', enum: ['TRC20', 'ERC20', 'BEP20'], example: 'TRC20' },
          walletAddress: { type: 'string', example: 'TXYZabcdefghijklmnopqrstuvwx' },
          qrImage: { type: 'string', example: 'https://example.com/qr.png' },
          active: { type: 'boolean', example: true },
          minAmount: { type: 'number', example: 10 },
          maxAmount: { type: 'number', example: 10000 }
        }
      },
      SubmitPaymentRequest: {
        type: 'object',
        required: ['amountUSDT', 'txHash'],
        properties: {
          amountUSDT: { type: 'number', minimum: 0.01, example: 50 },
          txHash: { type: 'string', example: '0xabc123def456' },
          network: { type: 'string', enum: ['TRC20', 'ERC20', 'BEP20'], example: 'TRC20' }
        }
      },
      Payment: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            ]
          },
          amountUSDT: { type: 'number', example: 50 },
          txHash: { type: 'string', example: '0xabc123def456' },
          network: { type: 'string', enum: ['TRC20', 'ERC20', 'BEP20'] },
          status: { type: 'string', enum: ['pending', 'verified', 'approved', 'rejected'] },
          blockchainVerified: { type: 'boolean' },
          adminNote: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      PaymentList: {
        type: 'object',
        properties: {
          payments: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
          pagination: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 12 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 50 },
              pages: { type: 'integer', example: 1 }
            }
          }
        }
      },
      Stats: {
        type: 'object',
        properties: {
          totalUsers: { type: 'integer', example: 8 },
          totalPayments: { type: 'integer', example: 21 },
          pendingPayments: { type: 'integer', example: 3 },
          totalAmount: { type: 'number', example: 1250.5 }
        }
      },
      ApproveRequest: {
        type: 'object',
        properties: {
          note: { type: 'string', example: 'Verified on chain' },
          skipVerification: { type: 'boolean', example: true, description: 'Skip blockchain check (local/dev)' }
        }
      },
      RejectRequest: {
        type: 'object',
        properties: {
          note: { type: 'string', example: 'Invalid transaction hash' }
        }
      },
      Admin: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string', example: 'admin@apex.com' },
          name: { type: 'string', example: 'Super Admin' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateAdminRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ops@apex.com' },
          password: { type: 'string', example: 'Admin@123' },
          name: { type: 'string', example: 'Ops Admin' }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        operationId: 'getHealth',
        summary: 'Health check',
        description: 'Returns API status. No authentication required.',
        parameters: [],
        responses: {
          200: {
            description: 'API is running',
            content: jsonContent(
              {
                type: 'object',
                properties: {
                  status: { type: 'string', example: 'OK' },
                  timestamp: { type: 'string', format: 'date-time' },
                  uptime: { type: 'number', example: 12.5 }
                }
              },
              { status: 'OK', timestamp: '2026-08-14T21:00:00.000Z', uptime: 12.5 }
            )
          }
        }
      }
    },
    '/api/auth/admin/login': {
      post: {
        tags: ['Auth'],
        operationId: 'adminLogin',
        summary: 'Admin login',
        description: 'Returns a JWT for admin routes. Default account: admin@apex.com / Apex@123',
        requestBody: jsonBody(
          { $ref: '#/components/schemas/LoginRequest' },
          { email: 'admin@apex.com', password: 'Apex@123' },
          true,
          'Admin email and password'
        ),
        responses: {
          200: { description: 'Login successful', content: jsonContent({ $ref: '#/components/schemas/AuthResponse' }) },
          400: errorResponse('Email and password required'),
          401: errorResponse('Invalid credentials')
        }
      }
    },
    '/api/auth/user/login': {
      post: {
        tags: ['Auth'],
        operationId: 'userLogin',
        summary: 'User login',
        description: 'Returns a JWT for user portal routes. Create the user first from the admin panel.',
        requestBody: jsonBody(
          { $ref: '#/components/schemas/LoginRequest' },
          { email: 'john@example.com', password: 'User@123' },
          true,
          'User email and password'
        ),
        responses: {
          200: { description: 'Login successful', content: jsonContent({ $ref: '#/components/schemas/AuthResponse' }) },
          400: errorResponse('Email and password required'),
          401: errorResponse('Invalid credentials')
        }
      }
    },
    '/api/auth/user/logout': {
      post: {
        tags: ['Auth'],
        operationId: 'userLogout',
        summary: 'User logout',
        description: 'Revokes the current user JWT. Send `Authorization: Bearer <token>`. After this call the token cannot be used again.',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: {
            description: 'Logged out',
            content: jsonContent(
              { $ref: '#/components/schemas/MessageResponse' },
              { message: 'Logged out successfully' }
            )
          },
          401: errorResponse('No token provided')
        }
      }
    },
    '/api/auth/admin/logout': {
      post: {
        tags: ['Auth'],
        operationId: 'adminLogout',
        summary: 'Admin logout',
        description: 'Revokes the current admin JWT.',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: {
            description: 'Logged out',
            content: jsonContent(
              { $ref: '#/components/schemas/MessageResponse' },
              { message: 'Logged out successfully' }
            )
          },
          401: errorResponse('No token provided')
        }
      }
    },
    '/api/auth/verify': {
      get: {
        tags: ['Auth'],
        operationId: 'verifyToken',
        summary: 'Verify JWT',
        description: 'Checks whether the Bearer token is a valid admin or user session.',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: { description: 'Token is valid', content: jsonContent({ $ref: '#/components/schemas/VerifyResponse' }) },
          401: errorResponse('Invalid token')
        }
      }
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        operationId: 'getMyProfile',
        summary: 'Current user profile',
        description: 'Returns the logged-in user. Requires a **user** JWT.',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: { description: 'User profile', content: jsonContent({ $ref: '#/components/schemas/User' }) },
          401: errorResponse('Unauthorized')
        }
      }
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        operationId: 'listUsers',
        summary: 'List users',
        description: 'Returns all users. Requires an **admin** JWT.',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: {
            description: 'User list',
            content: jsonContent({ type: 'array', items: { $ref: '#/components/schemas/User' } })
          },
          401: errorResponse('Unauthorized')
        }
      },
      post: {
        tags: ['Users'],
        operationId: 'createUser',
        summary: 'Create user',
        description: 'Creates a user who can log in to `/portal`. Requires an **admin** JWT.',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/CreateUserRequest' },
          { name: 'John Doe', email: 'john@example.com', password: 'User@123' },
          true,
          'New user details'
        ),
        responses: {
          201: { description: 'User created', content: jsonContent({ $ref: '#/components/schemas/MessageResponse' }) },
          400: errorResponse('Email already exists'),
          401: errorResponse('Unauthorized')
        }
      }
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        operationId: 'getUser',
        summary: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        responses: {
          200: { description: 'User', content: jsonContent({ $ref: '#/components/schemas/User' }) },
          401: errorResponse('Unauthorized'),
          404: errorResponse('User not found')
        }
      },
      patch: {
        tags: ['Users'],
        operationId: 'updateUser',
        summary: 'Update user',
        description: 'Update name, email, and/or password. Password is optional.',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/UpdateUserRequest' },
          { name: 'John Doe', email: 'john@example.com' },
          true,
          'Fields to update'
        ),
        responses: {
          200: { description: 'Updated' },
          400: errorResponse('Email already exists'),
          404: errorResponse('User not found')
        }
      },
      delete: {
        tags: ['Users'],
        operationId: 'deleteUser',
        summary: 'Delete user',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        responses: {
          200: { description: 'Deleted', content: jsonContent({ $ref: '#/components/schemas/MessageResponse' }, { message: 'User deleted successfully' }) },
          404: errorResponse('User not found')
        }
      }
    },
    '/api/users/{id}/status': {
      patch: {
        tags: ['Users'],
        operationId: 'updateUserStatus',
        summary: 'Enable or disable user',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/UserStatusRequest' },
          { status: 'disabled' },
          true,
          'New account status'
        ),
        responses: {
          200: { description: 'Status updated' },
          400: errorResponse('Invalid status'),
          404: errorResponse('User not found')
        }
      }
    },
    '/api/payments/settings': {
      get: {
        tags: ['Payments'],
        operationId: 'getPaymentSettings',
        summary: 'Get payment settings',
        description: 'Public. Returns receiving wallet, network, and min/max amounts.',
        parameters: [],
        responses: {
          200: { description: 'Settings', content: jsonContent({ $ref: '#/components/schemas/PaymentSetting' }) }
        }
      },
      post: {
        tags: ['Payments'],
        operationId: 'updatePaymentSettings',
        summary: 'Update payment settings',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/UpdateSettingsRequest' },
          {
            network: 'TRC20',
            walletAddress: 'TXYZabcdefghijklmnopqrstuvwx',
            qrImage: '',
            active: true,
            minAmount: 10,
            maxAmount: 10000
          },
          true,
          'Wallet and limit configuration'
        ),
        responses: {
          200: { description: 'Updated' },
          401: errorResponse('Unauthorized')
        }
      }
    },
    '/api/payments': {
      get: {
        tags: ['Payments'],
        operationId: 'listPayments',
        summary: 'List payments',
        description: 'Admin list with pagination and optional status filter.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/Authorization' },
          { $ref: '#/components/parameters/PaymentStatus' },
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' }
        ],
        responses: {
          200: { description: 'Paginated payments', content: jsonContent({ $ref: '#/components/schemas/PaymentList' }) },
          401: errorResponse('Unauthorized')
        }
      },
      post: {
        tags: ['Payments'],
        operationId: 'submitPayment',
        summary: 'Submit a deposit',
        description: 'User submits amount and blockchain tx hash after sending USDT.',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/SubmitPaymentRequest' },
          { amountUSDT: 50, txHash: '0xabc123def456', network: 'TRC20' },
          true,
          'Deposit details'
        ),
        responses: {
          201: { description: 'Submitted' },
          400: errorResponse('Amount and Transaction Hash are required'),
          401: errorResponse('Unauthorized')
        }
      }
    },
    '/api/payments/my': {
      get: {
        tags: ['Payments'],
        operationId: 'getMyPayments',
        summary: 'Current user payments',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: {
            description: 'Payment list',
            content: jsonContent({ type: 'array', items: { $ref: '#/components/schemas/Payment' } })
          },
          401: errorResponse('Unauthorized')
        }
      }
    },
    '/api/payments/stats': {
      get: {
        tags: ['Payments'],
        operationId: 'getPaymentStats',
        summary: 'Dashboard stats',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: { description: 'Stats', content: jsonContent({ $ref: '#/components/schemas/Stats' }) },
          401: errorResponse('Unauthorized')
        }
      }
    },
    '/api/payments/{id}': {
      get: {
        tags: ['Payments'],
        operationId: 'getPayment',
        summary: 'Get payment by ID',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        responses: {
          200: { description: 'Payment', content: jsonContent({ $ref: '#/components/schemas/Payment' }) },
          404: errorResponse('Payment not found')
        }
      }
    },
    '/api/payments/{id}/approve': {
      patch: {
        tags: ['Payments'],
        operationId: 'approvePayment',
        summary: 'Approve payment',
        description: 'Credits the user balance. Use skipVerification=true for local testing.',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/ApproveRequest' },
          { note: 'Approved', skipVerification: true },
          true,
          'Approval options'
        ),
        responses: {
          200: { description: 'Approved' },
          400: errorResponse('Payment already reviewed'),
          404: errorResponse('Payment not found')
        }
      }
    },
    '/api/payments/{id}/reject': {
      patch: {
        tags: ['Payments'],
        operationId: 'rejectPayment',
        summary: 'Reject payment',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/RejectRequest' },
          { note: 'Invalid transaction hash' },
          true,
          'Rejection reason'
        ),
        responses: {
          200: { description: 'Rejected' },
          400: errorResponse('Payment already reviewed'),
          404: errorResponse('Payment not found')
        }
      }
    },
    '/api/admins/create-default': {
      post: {
        tags: ['Admins'],
        operationId: 'createDefaultAdmin',
        summary: 'Create first admin',
        description: 'Only works when the admins collection is empty.',
        requestBody: jsonBody(
          { $ref: '#/components/schemas/CreateAdminRequest' },
          { email: 'admin@apex.com', password: 'Apex@123', name: 'Super Admin' },
          false,
          'Optional. Falls back to ADMIN_EMAIL / ADMIN_PASSWORD from .env'
        ),
        responses: {
          201: { description: 'Created' },
          400: errorResponse('Admin(s) already exist')
        }
      }
    },
    '/api/admins': {
      get: {
        tags: ['Admins'],
        operationId: 'listAdmins',
        summary: 'List admins',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        responses: {
          200: {
            description: 'Admin list',
            content: jsonContent({ type: 'array', items: { $ref: '#/components/schemas/Admin' } })
          },
          401: errorResponse('Unauthorized')
        }
      },
      post: {
        tags: ['Admins'],
        operationId: 'createAdmin',
        summary: 'Create admin',
        security: [{ bearerAuth: [] }],
        parameters: authHeader,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/CreateAdminRequest' },
          { email: 'ops@apex.com', password: 'Admin@123', name: 'Ops Admin' },
          true,
          'New admin details'
        ),
        responses: {
          201: { description: 'Created' },
          400: errorResponse('Admin already exists')
        }
      }
    },
    '/api/admins/{id}': {
      patch: {
        tags: ['Admins'],
        operationId: 'updateAdmin',
        summary: 'Update admin',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/CreateAdminRequest' },
          { name: 'Ops Admin', email: 'ops@apex.com' },
          true,
          'Fields to update'
        ),
        responses: {
          200: { description: 'Updated' },
          404: errorResponse('Admin not found')
        }
      },
      delete: {
        tags: ['Admins'],
        operationId: 'deleteAdmin',
        summary: 'Delete admin',
        security: [{ bearerAuth: [] }],
        parameters: idAndAuth,
        responses: {
          200: { description: 'Deleted', content: jsonContent({ $ref: '#/components/schemas/MessageResponse' }, { message: 'Admin deleted' }) },
          404: errorResponse('Admin not found')
        }
      }
    }
  }
};

module.exports = swaggerSpec;
