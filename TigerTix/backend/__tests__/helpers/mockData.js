/**
 * @fileoverview Mock data for TigerTix backend testing
 */

/**
 * Sample event data for testing
 */
const mockEvents = [
  {
    id: 1,
    name: 'Auburn vs Alabama Football',
    description: 'Iron Bowl 2024 - The biggest rivalry in college football',
    date: '2024-11-30',
    time: '15:30',
    location: 'Jordan-Hare Stadium',
    total_tickets: 1000,
    available_tickets: 750,
    price: 85.00,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 2,
    name: 'Auburn Basketball vs Kentucky',
    description: 'SEC Conference basketball game',
    date: '2024-12-15',
    time: '20:00',
    location: 'Auburn Arena',
    total_tickets: 500,
    available_tickets: 300,
    price: 35.00,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z'
  },
  {
    id: 3,
    name: 'Spring Concert Series',
    description: 'Annual spring outdoor concert featuring local artists',
    date: '2025-04-20',
    time: '19:00',
    location: 'Amphitheater',
    total_tickets: 800,
    available_tickets: 800,
    price: 25.00,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z'
  }
];

/**
 * Sample booking data for testing
 */
const mockBookings = [
  {
    id: 1,
    event_id: 1,
    customer_name: 'John Smith',
    customer_email: 'john.smith@example.com',
    tickets_purchased: 2,
    total_amount: 170.00,
    booking_date: '2024-11-01T14:30:00.000Z',
    status: 'confirmed'
  },
  {
    id: 2,
    event_id: 2,
    customer_name: 'Sarah Johnson',
    customer_email: 'sarah.j@example.com',
    tickets_purchased: 4,
    total_amount: 140.00,
    booking_date: '2024-11-02T09:15:00.000Z',
    status: 'confirmed'
  }
];

/**
 * Sample LLM chat messages for testing
 */
const mockChatMessages = [
  {
    role: 'user',
    content: 'I want to book tickets for the Auburn football game',
    timestamp: '2024-11-02T10:00:00.000Z'
  },
  {
    role: 'assistant',
    content: 'I found the Auburn vs Alabama Football game on November 30th. How many tickets would you like?',
    timestamp: '2024-11-02T10:00:05.000Z'
  },
  {
    role: 'user',
    content: 'I need 2 tickets please',
    timestamp: '2024-11-02T10:00:30.000Z'
  },
  {
    role: 'assistant',
    content: 'Great! I can book 2 tickets for the Auburn vs Alabama Football game. The total cost will be $170.00. May I have your name and email to complete the booking?',
    timestamp: '2024-11-02T10:00:35.000Z'
  }
];

/**
 * Sample OpenAI API responses for testing
 */
const mockOpenAIResponses = {
  parseBooking: {
    choices: [{
      message: {
        content: JSON.stringify({
          intent: 'book_tickets',
          event_keywords: ['auburn', 'football', 'alabama'],
          quantity: 2,
          preferences: {
            date_preference: '2024-11-30',
            event_type: 'football'
          },
          confidence: 0.95
        })
      }
    }]
  },
  
  confirmBooking: {
    choices: [{
      message: {
        content: JSON.stringify({
          action: 'confirm_booking',
          customer_info: {
            name: 'John Smith',
            email: 'john.smith@example.com'
          },
          booking_details: {
            event_id: 1,
            tickets: 2,
            total_cost: 170.00
          },
          confirmation_message: 'Your booking has been confirmed! You will receive a confirmation email shortly.'
        })
      }
    }]
  },
  
  error: {
    error: {
      message: 'Invalid API key',
      type: 'invalid_request_error',
      code: 'invalid_api_key'
    }
  }
};

/**
 * Valid test input data
 */
const validTestInputs = {
  createEvent: {
    name: 'Test Event',
    description: 'A test event for unit testing',
    date: '2024-12-01',
    time: '18:00',
    location: 'Test Venue',
    total_tickets: 100,
    price: 20.00
  },
  
  purchaseTickets: {
    customer_name: 'Test Customer',
    customer_email: 'test@example.com',
    tickets_purchased: 2
  },
  
  llmQuery: {
    message: 'I want to book 3 tickets for the basketball game next week',
    chat_history: []
  }
};

/**
 * Invalid test input data for error testing
 */
const invalidTestInputs = {
  createEvent: {
    missing_name: {
      description: 'Event without name',
      date: '2024-12-01',
      time: '18:00',
      location: 'Test Venue',
      total_tickets: 100,
      price: 20.00
    },
    
    invalid_date: {
      name: 'Test Event',
      description: 'Event with invalid date',
      date: 'invalid-date',
      time: '18:00',
      location: 'Test Venue',
      total_tickets: 100,
      price: 20.00
    },
    
    negative_tickets: {
      name: 'Test Event',
      description: 'Event with negative tickets',
      date: '2024-12-01',
      time: '18:00',
      location: 'Test Venue',
      total_tickets: -10,
      price: 20.00
    }
  },
  
  purchaseTickets: {
    missing_email: {
      customer_name: 'Test Customer',
      tickets_purchased: 2
    },
    
    invalid_email: {
      customer_name: 'Test Customer',
      customer_email: 'invalid-email',
      tickets_purchased: 2
    },
    
    zero_tickets: {
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      tickets_purchased: 0
    }
  }
};

/**
 * HTTP response templates for testing
 */
const httpResponses = {
  success: {
    status: 200,
    message: 'Success'
  },
  
  created: {
    status: 201,
    message: 'Created successfully'
  },
  
  badRequest: {
    status: 400,
    error: 'Bad Request',
    message: 'Invalid input data'
  },
  
  notFound: {
    status: 404,
    error: 'Not Found',
    message: 'Resource not found'
  },
  
  serverError: {
    status: 500,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  }
};

module.exports = {
  mockEvents,
  mockBookings,
  mockChatMessages,
  mockOpenAIResponses,
  validTestInputs,
  invalidTestInputs,
  httpResponses
};