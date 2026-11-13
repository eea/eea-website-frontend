/**
 * Plone answers its own browser views (`/contact-info`, `/mail_password_form`)
 * with an HTML page on the plain path and on `++api++`. Volto used to fetch that
 * page as content, the reducers crashed and SSR answered 500 (refs #310279).
 * `middleware/contentPayloadGuard` turns a payload without `@id` into a 404, on
 * the client and on the server.
 *
 * The suite reads `baseUrl` from `cypress.config.js`, so `make cypress-staging`
 * and `make cypress-production` run the same assertions against a deployed site.
 */

const origin = new URL(Cypress.config('baseUrl')).origin;

const request = (path) =>
  cy.request({
    url: `${origin}${path}`,
    followRedirect: false,
    failOnStatusCode: false,
  });

describe('Non-content payloads', () => {
  it('answers 404 instead of 500 for the Plone browser views', () => {
    ['/contact-info', '/en/about/contact-us/contact-info'].forEach((path) => {
      request(path).then(({ status }) => {
        expect(status, path).to.eq(404);
      });
    });
  });

  it('answers 404 instead of 500 for an unknown path', () => {
    request('/en/this-path-does-not-exist').then(({ status }) => {
      expect(status).to.eq(404);
    });
  });

  it('answers a JSON 404 for a feed that does not exist', () => {
    request('/rss.xml').then(({ status, headers }) => {
      expect(status).to.eq(404);
      expect(headers['content-type']).to.include('application/json');
    });
  });
});
