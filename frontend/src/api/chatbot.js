import api from './axios';

/**
 * Send a natural-language query to the school chatbot.
 * Response shape: { success: true, data: { intent: string, response: string } }
 * Note: data.data is an object (not array), so the axios interceptor does NOT unwrap it.
 * Access the response via: r.data.data.response
 */
export const sendChatbotQuery = (message) =>
  api.post('/chatbot/query', { message });
