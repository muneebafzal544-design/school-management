import api from './axios';

export const generateTimetable = (data) =>
  api.post('/timetable-generator/generate', data);

export const saveGeneratedTimetable = (data) =>
  api.post('/timetable-generator/save', data);
