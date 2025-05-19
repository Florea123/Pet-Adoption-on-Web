const config = {
  SERVICES: {
    USER_SERVICE: 'http://localhost:3000',
    ANIMAL_SERVICE: 'http://localhost:3001',
    MEDIA_SERVICE: 'http://localhost:3002',
    MESSAGE_SERVICE: 'http://localhost:3003',
    NEWSLETTER_SERVICE: 'http://localhost:3004',
    ADMIN_SERVICE: 'http://localhost:3000' 
  },
  ENDPOINTS: {
    // User service endpoints
    USER: {
      LOGIN: '/users/login',
      REGISTER: '/users/signup',
      ALL_DETAILS: '/users/all/details',
      DELETE: '/users/delete'
    },
    // Admin service endpoints
    ADMIN: {
      LOGIN: '/admin/login'
    },
    // Media service endpoints
    MEDIA: {
      PIPE: '/media/pipe',
      UPLOAD: '/upload'
    },
    // Animal service endpoints
    ANIMAL: {
      ALL: '/animals/all',
      DETAILS: '/animals/details',
      BY_SPECIES: '/animals/species', 
      CREATE: '/animals/create',
      DELETE: '/animals/delete',
      TOP_BY_CITY: '/animals/top-by-city'
    },
    // Message service endpoints
    MESSAGE: {
      SEND: '/messages/send',
      CONVERSATION: '/messages/conversation',
      CONVERSATIONS: '/messages/conversations',
      READ: '/messages/read',
      UNREAD_COUNT: '/messages/unread-count'
    },
    // Newsletter service endpoints
    NEWSLETTER: {
      SUBSCRIPTIONS: '/newsletter/subscriptions', 
      UPDATE: '/newsletter/update' 
    }
  }
};

export default config;