import api from './axios';

export const getOnboardingProgress = () =>
  api.get('/onboarding/progress');

export const saveSchoolInfo = (data) =>
  api.post('/onboarding/school-info', data);

export const completeOnboarding = () =>
  api.post('/onboarding/complete');
