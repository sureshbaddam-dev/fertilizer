const isDebug = process.env.DEBUG_LOGS === 'true';

// Allowed startup & OTP messages for normal terminal output
function isAllowedInfo(msgStr) {
  if (!msgStr) return false;
  const str = String(msgStr).trim();
  if (str === 'MongoDB connected') return true;
  if (str.startsWith('Server running on port ')) return true;
  if (str.startsWith('Admin OTP: ')) return true;
  if (str.startsWith('OTP: ')) return true;
  return false;
}

function formatError(arg1, arg2) {
  let raw = '';
  if (typeof arg1 === 'string') {
    raw = arg1;
  } else if (typeof arg2 === 'string') {
    raw = arg2;
  } else if (arg1?.message) {
    raw = arg1.message;
  } else if (arg2?.message) {
    raw = arg2.message;
  } else {
    raw = String(arg1 || arg2 || 'An error occurred');
  }

  // Ensure clean single line format: ERROR: <short message>
  const singleLine = raw.replace(/^ERROR:\s*/i, '').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
  return `ERROR: ${singleLine}`;
}

export const logger = {
  info: (arg1, arg2) => {
    let msgStr = '';
    if (typeof arg1 === 'string') {
      msgStr = arg1;
    } else if (typeof arg2 === 'string') {
      msgStr = arg2;
    } else if (arg1?.msg) {
      msgStr = arg1.msg;
    }

    if (isAllowedInfo(msgStr) || isDebug) {
      if (msgStr) {
        console.log(msgStr);
      }
    }
  },

  error: (arg1, arg2) => {
    const errorLine = formatError(arg1, arg2);
    console.error(errorLine);

    if (isDebug) {
      const stack = arg1?.stack || arg1?.err?.stack || arg1?.error?.stack || arg2?.stack;
      if (stack) {
        console.error(stack);
      }
    }
  },

  warn: (arg1, arg2) => {
    if (isDebug) {
      const msgStr = typeof arg1 === 'string' ? arg1 : typeof arg2 === 'string' ? arg2 : arg1?.msg || arg1?.error || '';
      if (msgStr) {
        console.warn(`WARN: ${typeof msgStr === 'object' ? JSON.stringify(msgStr) : msgStr}`);
      }
    }
  },

  debug: (arg1, arg2) => {
    if (isDebug) {
      const msgStr = typeof arg1 === 'string' ? arg1 : typeof arg2 === 'string' ? arg2 : arg1?.msg || '';
      if (msgStr) {
        console.log(`DEBUG: ${msgStr}`);
      }
    }
  },
};

