import React from 'react';

/**
 * Test view that deliberately crashes during SSR to test Sentry error capture
 * Only crashes on server-side rendering, works fine on client
 */
export default function SSRCrash() {
  if (__SERVER__) {
    // This will throw during server-side rendering and should be captured by Sentry
    throw new Error('SSR crash test: thrown during server-side render - This should appear in Sentry');
  }
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>SSR Test Passed ✅</h1>
      <p>This page loaded successfully on the client side.</p>
      <p>If you see this, it means the SSR error was handled properly.</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f8ff', border: '1px solid #ccc' }}>
        <strong>Note:</strong> This page deliberately throws an error during server-side rendering 
        to test Sentry SSR error capture. Check your Sentry dashboard for the captured error.
      </div>
    </div>
  );
}