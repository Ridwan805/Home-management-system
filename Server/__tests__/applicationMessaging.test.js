const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Mock Models
jest.mock('../models/Request');
jest.mock('../models/Property');
jest.mock('../models/User');
jest.mock('../models/Notification');
jest.mock('../services/notificationService');
jest.mock('../services/emailService');

const Request = require('../models/Request');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const NotificationService = require('../services/notificationService');
const { sendMessageNotificationEmail } = require('../services/emailService');

const {
  getRequestMessages,
  addMessage,
  markMessagesAsRead
} = require('../controllers/requestManagement.controller');

// Create test app with auth mock
const createTestApp = (currentUser) => {
  const app = express();
  app.use(express.json());
  
  // Fake auth middleware
  app.use((req, res, next) => {
    req.user = currentUser;
    next();
  });

  app.get('/api/request-management/:requestId/messages', getRequestMessages);
  app.post('/api/request-management/:requestId/messages', addMessage);
  app.patch('/api/request-management/:requestId/messages/read', markMessagesAsRead);

  return app;
};

describe('Application Messaging System Tests', () => {
  const tenantId = new mongoose.Types.ObjectId().toString();
  const ownerId = new mongoose.Types.ObjectId().toString();
  const outsiderId = new mongoose.Types.ObjectId().toString();
  const requestId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /:requestId/messages - Authorized tenant receives messages and correct unread count', async () => {
    const mockRequest = {
      _id: requestId,
      requestId: 'REQ-1001',
      status: 'Submitted',
      tenantId: { _id: tenantId, firstName: 'John', lastName: 'Tenant', email: 'tenant@test.com' },
      ownerId: { _id: ownerId, firstName: 'Alice', lastName: 'Owner', email: 'owner@test.com' },
      propertyId: { _id: 'prop123', title: 'Luxury Apt', address: '123 Main St' },
      messages: [
        {
          _id: 'msg1',
          senderId: { _id: ownerId, firstName: 'Alice', lastName: 'Owner' },
          message: 'Hello, please provide additional info.',
          timestamp: new Date(),
          readBy: [ownerId], // unread for tenant
          isRead: false
        },
        {
          _id: 'msg2',
          senderId: { _id: tenantId, firstName: 'John', lastName: 'Tenant' },
          message: 'Sure, here it is.',
          timestamp: new Date(),
          readBy: [tenantId],
          isRead: false
        }
      ]
    };

    Request.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve(mockRequest); }
    });

    const app = createTestApp({ userId: tenantId, role: 'Tenant' });
    const res = await request(app).get(`/api/request-management/${requestId}/messages`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.messages).toHaveLength(2);
    // Unread count for tenant should be 1 (only msg1 from owner)
    expect(res.body.unreadCount).toBe(1);
    expect(res.body.property.title).toBe('Luxury Apt');
  });

  test('GET /:requestId/messages - Rejects unauthorized outsider with 403', async () => {
    const mockRequest = {
      _id: requestId,
      tenantId: { _id: tenantId },
      ownerId: { _id: ownerId },
      messages: []
    };

    Request.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve(mockRequest); }
    });

    const app = createTestApp({ userId: outsiderId, role: 'Tenant' });
    const res = await request(app).get(`/api/request-management/${requestId}/messages`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Not authorized/i);
  });

  test('POST /:requestId/messages - Validates non-empty text and enforces 2000 character limit', async () => {
    const app = createTestApp({ userId: tenantId, role: 'Tenant' });

    // Empty message
    const emptyRes = await request(app)
      .post(`/api/request-management/${requestId}/messages`)
      .send({ message: '   ' });
    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.message).toMatch(/cannot be empty/i);

    // Over 2000 chars
    const longRes = await request(app)
      .post(`/api/request-management/${requestId}/messages`)
      .send({ message: 'a'.repeat(2001) });
    expect(longRes.status).toBe(400);
    expect(longRes.body.message).toMatch(/maximum length/i);
  });

  test('POST /:requestId/messages - Successfully adds message, sets readBy and sends notifications', async () => {
    const mockRequest = {
      _id: requestId,
      tenantId: { _id: tenantId, firstName: 'John', lastName: 'Tenant', email: 'tenant@test.com' },
      ownerId: { _id: ownerId, firstName: 'Alice', lastName: 'Owner', email: 'owner@test.com' },
      propertyId: { _id: 'prop123', title: 'Sunset Condo' },
      messages: [],
      timeline: [],
      save: jest.fn().mockResolvedValue(true),
      populate: jest.fn().mockResolvedValue(true)
    };

    Request.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      then: function(resolve) { resolve(mockRequest); }
    });

    NotificationService.createNotification = jest.fn().mockResolvedValue(true);
    sendMessageNotificationEmail.mockResolvedValue({ success: true });

    const app = createTestApp({ userId: ownerId, role: 'Owner' });
    const res = await request(app)
      .post(`/api/request-management/${requestId}/messages`)
      .send({ message: 'Welcome to the building! <script>alert(1)</script>' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(mockRequest.messages).toHaveLength(1);
    expect(mockRequest.messages[0].message).toBe('Welcome to the building!');
    expect(mockRequest.messages[0].senderId).toBe(ownerId);
    expect(mockRequest.messages[0].readBy).toContain(ownerId);
    expect(mockRequest.save).toHaveBeenCalled();
    expect(NotificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: tenantId,
      type: 'message'
    }));
  });

  test('PATCH /:requestId/messages/read - Marks other participant messages as read without affecting self messages', async () => {
    const mockRequest = {
      _id: requestId,
      tenantId: { _id: tenantId },
      ownerId: { _id: ownerId },
      messages: [
        {
          _id: 'msg_owner',
          senderId: ownerId,
          message: 'Hello',
          readBy: [ownerId],
          isRead: false
        },
        {
          _id: 'msg_tenant',
          senderId: tenantId,
          message: 'My reply',
          readBy: [tenantId],
          isRead: false
        }
      ],
      save: jest.fn().mockResolvedValue(true)
    };

    Request.findById.mockResolvedValue(mockRequest);
    Notification.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });

    const app = createTestApp({ userId: tenantId, role: 'Tenant' });
    const res = await request(app).patch(`/api/request-management/${requestId}/messages/read`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.markedCount).toBe(1);
    // msg_owner should now have tenantId in readBy
    expect(mockRequest.messages[0].readBy).toContain(tenantId);
    expect(mockRequest.messages[0].isRead).toBe(true);
    expect(mockRequest.save).toHaveBeenCalled();
    expect(Notification.updateMany).toHaveBeenCalled();
  });
});
