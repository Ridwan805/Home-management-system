/**
 * Email Validation Service using ZeroBounce API & RFC Syntax Verification
 */

const ZEROBOUNCE_BASE_URL = 'https://api.zerobounce.net/v2/validate';

// Common disposable/temporary email domains list for fast local screening
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'fakemailgenerator.com'
]);

// RFC 5322 compliant email regex pattern
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Validates an email address syntax and checks with ZeroBounce API
 * @param {string} email - Email address to check
 * @returns {Promise<{ isValid: boolean, reason?: string, details?: any }>}
 */
async function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, reason: 'Email address is required' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Length check
  if (cleanEmail.length > 254) {
    return { isValid: false, reason: 'Email address exceeds maximum length of 254 characters' };
  }

  // 2. Syntax check
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { isValid: false, reason: 'Invalid email address format' };
  }

  const domain = cleanEmail.split('@')[1];

  // 3. Disposable domain screening
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { isValid: false, reason: 'Disposable / temporary email addresses are not allowed' };
  }

  // 4. ZeroBounce API verification
  const apiKey = process.env.ZEROBOUNCE_API_KEY || '';

  if (!apiKey) {
    return { isValid: true, provider: 'syntax-only' };
  }

  try {
    const url = `${ZEROBOUNCE_BASE_URL}?api_key=${apiKey}&email=${encodeURIComponent(cleanEmail)}&ip_address=`;
    
    // 4-second timeout to avoid holding up registration if external service is slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (data.error) {
      // If ZeroBounce reports out of credits or key issue, gracefully log and allow format check
      console.warn(`[ZeroBounce Notice] ${data.error}. Proceeding with format verification for ${cleanEmail}.`);
      return { isValid: true, provider: 'syntax-fallback', warning: data.error };
    }

    // ZeroBounce status evaluations
    if (data.status === 'invalid') {
      const subStatusText = data.sub_status ? ` (${data.sub_status.replace(/_/g, ' ')})` : '';
      return {
        isValid: false,
        reason: `The email address does not appear to be active or deliverable${subStatusText}. Please provide a valid email.`,
        details: data
      };
    }

    if (data.status === 'spamtrap' || data.status === 'abuse') {
      return {
        isValid: false,
        reason: 'This email address has been flagged as high-risk or invalid. Please use a standard email address.',
        details: data
      };
    }

    console.log(`✅ ZeroBounce check for ${cleanEmail}: ${data.status} (${data.sub_status || 'ok'})`);
    return {
      isValid: true,
      status: data.status,
      subStatus: data.sub_status,
      domain: data.domain,
      freeEmail: data.free_email,
      provider: 'zerobounce'
    };
  } catch (err) {
    console.warn(`[ZeroBounce Service Warning] Validation request failed: ${err.message}. Defaulting to syntax validation.`);
    return { isValid: true, provider: 'syntax-fallback', warning: err.message };
  }
}

module.exports = {
  validateEmail
};
