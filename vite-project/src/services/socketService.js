// vite-project/src/services/socketService.js
import { io } from 'socket.io-client';
import { getApiBaseUrl } from '../config/api';

class ClientSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to Socket.IO backend
   * @param {string} token - Optional JWT token
   */
  connect(token) {
    if (this.socket && this.isConnected) {
      if (token) {
        this.socket.emit('authenticate', token);
      }
      return this.socket;
    }

    const baseUrl = getApiBaseUrl();

    this.socket = io(baseUrl, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('⚡ [Socket.IO] Client connected to server:', this.socket.id);
      if (token) {
        this.socket.emit('authenticate', token);
      }
      this.notifyListeners('connection_change', true);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('⚡ [Socket.IO] Client disconnected:', reason);
      this.notifyListeners('connection_change', false);
    });

    this.socket.on('connect_error', (error) => {
      this.isConnected = false;
      console.warn('⚠️ [Socket.IO] Connection error:', error.message);
      this.notifyListeners('connection_change', false);
    });

    // Handle incoming notifications
    this.socket.on('notification:new', (notification) => {
      this.notifyListeners('notification:new', notification);
    });

    this.socket.on('notification:unread_count', ({ unreadCount }) => {
      this.notifyListeners('notification:unread_count', unreadCount);
    });

    // Handle live messages
    this.socket.on('message:new', (data) => {
      this.notifyListeners('message:new', data);
    });

    this.socket.on('message:read', (data) => {
      this.notifyListeners('message:read', data);
    });

    this.socket.on('thread:message:new', (data) => {
      this.notifyListeners('thread:message:new', data);
    });

    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Join a specific conversation thread room
   */
  joinThread(requestId) {
    if (this.socket && requestId) {
      this.socket.emit('join_thread', { requestId });
    }
  }

  /**
   * Leave a conversation thread room
   */
  leaveThread(requestId) {
    if (this.socket && requestId) {
      this.socket.emit('leave_thread', { requestId });
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event 
   * @param {Function} callback 
   * @returns {Function} unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  }

  /**
   * Internal notify listeners
   */
  notifyListeners(event, data) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in socket listener for ${event}:`, e);
        }
      });
    }
  }
}

const socketService = new ClientSocketService();
export default socketService;
