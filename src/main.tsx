import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App.tsx';
import './index.css';

const BUILD_CLERK_PUBLISHABLE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY?.trim()) || '';

// Anti-circular safety console wrapper to protect external test runner telemetry from JSON.stringify failures
(function() {
  if (typeof window !== 'undefined') {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

      window.addEventListener('error', (event) => {
      const msg = event.message || '';
      const src = event.filename || '';
      if (msg.toLowerCase().includes('clerk') || src.toLowerCase().includes('clerk')) {
        return;
      }
      if (
        msg.includes('Script error.') || 
        msg.toLowerCase().includes('aframe') || 
        msg.toLowerCase().includes('webgl') || 
        msg.toLowerCase().includes('three') ||
        !event.filename
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return true;
      }
    }, true);

    window.onerror = (message, source, lineno, colno, error) => {
      const msg = String(message || '');
      if (
        msg.includes('Script error.') || 
        msg.toLowerCase().includes('aframe') || 
        msg.toLowerCase().includes('webgl') || 
        msg.toLowerCase().includes('three') ||
        !source
      ) {
        return true; // suppresses the error representation in browser console
      }
    };

    function sanitizeArg(arg: any, seen = new WeakSet()): any {
      if (arg === null || arg === undefined) return arg;
      if (typeof arg !== 'object' && typeof arg !== 'function') return arg;
      if (typeof arg === 'function') return `[Function: ${arg.name || 'anonymous'}]`;

      // 1. Safe Constructor / Name checks to catch React Fiber nodes, A-Frame custom HTML components ("a", "AEntity") and general elements early
      try {
        const ctor = arg.constructor;
        const ctorName = ctor && ctor.name;
        if (typeof ctorName === 'string') {
          const lowerCtor = ctorName.toLowerCase();
          if (
            ctorName === 'a' || 
            ctorName === 'AEntity' || 
            ctorName === 'AScene' || 
            ctorName === 'FiberNode' || 
            lowerCtor.includes('element') || 
            lowerCtor.includes('node') || 
            lowerCtor.includes('fiber')
          ) {
            return `[SystemObject: ${ctorName}]`;
          }
        }
      } catch {
        // Ignored
      }

      // 2. Prevent DOM element circularities (A-Frame, React refs, etc.)
      const isNode = (() => {
        try {
          return (typeof Node !== 'undefined' && arg instanceof Node) || ('nodeType' in arg && 'tagName' in arg);
        } catch {
          return false;
        }
      })();

      if (isNode) {
        try {
          const el = arg as any;
          const tagName = el.tagName ? el.tagName.toLowerCase() : 'node';
          const id = el.id ? `#${el.id}` : '';
          return `[HTMLElement <${tagName}${id}>]`;
        } catch {
          return '[HTMLElement]';
        }
      }

      // 3. Prevent Event circularities
      const isEvt = (() => {
        try {
          return (typeof Event !== 'undefined' && arg instanceof Event) || ('target' in arg && 'type' in arg);
        } catch {
          return false;
        }
      })();

      if (isEvt) {
        try {
          return `[Event type="${arg.type || 'unknown'}"]`;
        } catch {
          return '[Event]';
        }
      }

      // 4. Circular guard
      if (seen.has(arg)) {
        return '[Circular]';
      }
      seen.add(arg);

      // 5. React Fiber or system keys check: if an object contains keys starting with __react or reactive systems, prune recursion immediately
      try {
        let hasSystemKeys = false;
        for (const key in arg) {
          if (key.startsWith('__react') || key.startsWith('__vue') || key === 'stateNode' || key === 'memoizedState' || key === 'updateQueue') {
            hasSystemKeys = true;
            break;
          }
        }
        if (hasSystemKeys) {
          return '[SystemInternal]';
        }
      } catch {
        // Ignored
      }

      // 6. Safe Error handling
      const isErr = (() => {
        try {
          return (typeof Error !== 'undefined' && arg instanceof Error);
        } catch {
          return false;
        }
      })();

      if (isErr) {
        return {
          name: arg.name || 'Error',
          message: arg.message || String(arg),
          stack: arg.stack || ''
        };
      }

      // 7. Recursive copying with deep structural limitations
      try {
        const copy: any = Array.isArray(arg) ? [] : {};
        // Safely copy key value pairs
        for (const key in arg) {
          if (Object.prototype.hasOwnProperty.call(arg, key)) {
            if (key.startsWith('__react') || key.startsWith('__vue')) {
              continue;
            }
            const val = arg[key];
            if (typeof val === 'function') {
              continue;
            }
            copy[key] = sanitizeArg(val, seen);
          }
        }
        return copy;
      } catch {
        return String(arg);
      }
    }

    const wrapConsole = (original: (...args: any[]) => void) => {
      return (...args: any[]) => {
        let skip = false;
        const sanitizedArgs = args.map(arg => {
          try {
            return sanitizeArg(arg, new WeakSet());
          } catch {
            return String(arg);
          }
        });
        if (!skip) {
          original.apply(console, sanitizedArgs);
        }
      };
    };

    console.log = wrapConsole(originalLog);
    console.warn = wrapConsole(originalWarn);
    console.error = wrapConsole(originalError);
    console.info = wrapConsole(originalInfo);
  }
})();

async function resolveClerkPublishableKey(): Promise<string> {
  if (BUILD_CLERK_PUBLISHABLE_KEY) {
    return BUILD_CLERK_PUBLISHABLE_KEY;
  }
  try {
    const res = await fetch('/api/auth/config');
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.clerkPublishableKey === 'string' && data.clerkPublishableKey.trim() !== '') {
        return data.clerkPublishableKey.trim();
      }
    }
  } catch (err) {
    console.error('[Clerk Auth] Failed to fetch runtime auth config:', err);
  }
  return '';
}

resolveClerkPublishableKey().then((publishableKey) => {
  const rootEl = document.getElementById('root')!;
  if (!publishableKey) {
    console.error('[Clerk Auth] Missing VITE_CLERK_PUBLISHABLE_KEY.');
    createRoot(rootEl).render(
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
        <div style={{ maxWidth: '460px', width: '100%', background: '#ffffff', border: '1px solid #fecaca', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#991b1b' }}>
            Authentication Configuration Missing
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.5, color: '#475569' }}>
            Clerk authentication could not initialize because <code>VITE_CLERK_PUBLISHABLE_KEY</code> is not configured in this environment.
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code> in your Render Environment Variables and redeploy.
          </p>
        </div>
      </div>
    );
    return;
  }

  createRoot(rootEl).render(
    <ClerkProvider
      publishableKey={publishableKey}
      afterSignOutUrl="/"
      signInUrl="/"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <App />
    </ClerkProvider>
  );
});

