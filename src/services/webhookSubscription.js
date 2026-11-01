const GRAPH_BASE_URL = 'https://graph.facebook.com';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Subscribe this Meta app to one WhatsApp Business Account's webhook events.
 * Uses the app's existing system-user access token; never logs or returns it.
 *
 * @param {object} options
 * @param {string} options.apiVersion Graph API version, e.g. "v26.0"
 * @param {string} options.wabaId WhatsApp Business Account / Messaging Account ID
 * @param {string} options.accessToken System User access token
 * @param {Function} [options.fetchImpl] Injectable fetch for tests
 * @param {number} [options.timeoutMs]
 */
async function subscribeAppToWaba({
  apiVersion,
  wabaId,
  accessToken,
  fetchImpl = globalThis.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS
}) {
  if (!/^v\d+\.\d+$/.test(String(apiVersion || ''))) {
    return { success: false, reason: 'invalid_api_version' };
  }
  if (!/^\d+$/.test(String(wabaId || ''))) {
    return { success: false, reason: 'invalid_waba_id' };
  }
  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    return { success: false, reason: 'missing_access_token' };
  }
  if (typeof fetchImpl !== 'function') {
    return { success: false, reason: 'fetch_unavailable' };
  }

  const url = `${GRAPH_BASE_URL}/${apiVersion}/${encodeURIComponent(wabaId)}/subscribed_apps`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || !data || data.success !== true) {
      const apiError = data && data.error ? data.error : null;
      return {
        success: false,
        reason: 'meta_rejected_request',
        httpStatus: response.status,
        errorCode: apiError && apiError.code,
        errorSubcode: apiError && apiError.error_subcode,
        errorMessage: apiError && apiError.message,
        fbtraceId: apiError && apiError.fbtrace_id
      };
    }

    return { success: true, httpStatus: response.status };
  } catch (error) {
    return {
      success: false,
      reason: error && error.name === 'AbortError' ? 'timeout' : 'network_error'
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { subscribeAppToWaba, GRAPH_BASE_URL };
