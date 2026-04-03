
// Use a relative path if hosted on the same domain to avoid CORS issues entirely.
// Otherwise, fall back to the absolute URL.
const UPLOAD_URL = (typeof window !== 'undefined' && (window.location.hostname === 'kinnaram.online' || window.location.hostname === 'www.kinnaram.online'))
  ? '/upload.php'
  : 'https://kinnaram.online/upload.php';

export type SubFolder = 'hostprofile' | 'videos' | 'screenshots';

/**
 * Uploads a file to the server.
 * Handles common fetch errors like 'Failed to fetch' which are typically
 * caused by CORS issues, network disconnects, or SSL errors.
 */
export const uploadFile = async (file: File, folder: SubFolder): Promise<string> => {
  if (!file) throw new Error('ഫയൽ തിരഞ്ഞെടുത്തിട്ടില്ല (No file provided)');

  // Basic size check to prevent huge uploads that will likely fail
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit
  if (file.size > MAX_SIZE) {
    throw new Error('ഫയൽ സൈസ് കൂടുതലാണ്. 100MB-യിൽ താഴെയുള്ള ഫയലുകൾ മാത്രം അപ്‌ലോഡ് ചെയ്യുക.');
  }

  const formData = new FormData();
  formData.append('file', file, file.name);
  formData.append('folder', folder);

  try {
    // Simplified fetch call.
    // Standard FormData POST requests are often treated as 'simple requests'
    // by browsers, which can bypass some CORS preflight (OPTIONS) checks.
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      body: formData,
      // Note: We intentionally do NOT set the 'Content-Type' header here.
      // The browser will automatically set it to 'multipart/form-data'
      // along with the correct boundary string.
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server side error response:', errorText);
      throw new Error(`സർവർ എറർ: ${response.status}. അല്പം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.`);
    }

    const data = await response.json();
    if (data && data.status === 'success') {
      return data.url;
    } else {
      throw new Error(data?.message || 'അപ്‌ലോഡ് പരാജയപ്പെട്ടു. സർവർ മറുപടി ശരിയല്ല.');
    }
  } catch (error) {
    console.error('Detailed Upload Service Error:', error);
    
    // Handle the specific 'Failed to fetch' error which the user is experiencing.
    // This happens before the request completes (e.g., DNS, SSL, or CORS failure).
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('NetworkError'))) {
      throw new Error('നെറ്റ്‌വർക്ക് കണക്ഷൻ പരാജയപ്പെട്ടു! ഇന്റർനെറ്റ് റേഞ്ച് പരിശോധിക്കുക അല്ലെങ്കിൽ സർവർ ലഭ്യമല്ല. (Network error/CORS blocked)');
    }
    
    throw error;
  }
};
