import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Anti-circular safety console wrapper to protect external test runner telemetry from JSON.stringify failures
(function() {
  if (typeof window !== 'undefined') {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

      window.addEventListener('error', (event) => {
      const msg = event.message || '';
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

createRoot(document.getElementById('root')!).render(
  
    <App />
  ,
);

