import api from './axios';

/**
 * Download a full JSON backup of all school data.
 * Triggers a file download in the browser.
 */
export async function downloadBackup() {
  const res = await api.get('/backup/export', { responseType: 'blob' });

  // Build a filename from the Content-Disposition header if present,
  // otherwise use today's date.
  let filename = `schoolms-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const cd = res.headers['content-disposition'];
  if (cd) {
    const match = cd.match(/filename="?([^"]+)"?/);
    if (match) filename = match[1];
  }

  const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href  = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Restore all data from a previously downloaded backup JSON file.
 * @param {object} backupData  - Parsed JSON from the backup file
 */
export async function restoreBackup(backupData) {
  const res = await api.post('/backup/restore', {
    confirm: 'RESTORE',
    tables:  backupData.tables,
  });
  return res.data;
}
