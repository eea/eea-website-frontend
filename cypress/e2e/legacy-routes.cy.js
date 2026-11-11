// Legacy Plone routes are not content objects. Plone answers `@@`-views and
// file views with an HTML page, which Volto fetched as content: the reducers
// crashed on the client and SSR returned 500 (refs #310279).
//
// They are redirected to the parent object, or - for the Plone search views -
// to the site search page, by `@eeacms/volto-eea-website-theme`
// middleware/legacyRoutes.js. The dead Plone endpoints Volto cannot render at
// all (`/RSS`, `/atom.xml`, `/mail_password_form`) are answered with 410.
// The behaviour is opt-in per site, so other EEA frontends are not affected.
//
// Runs against whatever `baseUrl` points to (staging by default, see
// `make cypress`), so a release that regresses it fails here.

const origin = new URL(Cypress.config('baseUrl')).origin;

const request = (path) => cy.request({ url: `${origin}${path}`, followRedirect: false });

describe('Legacy Plone routes', () => {
  it('redirects the Plone search views to the site search page', () => {
    ['/@@search', '/search', '/fr/@@search', '/de/search'].forEach((path) => {
      request(path).then(({ status, headers }) => {
        expect(status, path).to.eq(301);
        expect(headers.location, path).to.eq('/en/advanced-search');
      });
    });
  });

  it('keeps the query string and maps SearchableText to q', () => {
    request('/@@search?SearchableText=pfas').then(({ status, headers }) => {
      expect(status).to.eq(301);
      expect(headers.location).to.eq('/en/advanced-search?q=pfas');
    });

    request('/en/search?q=pfas&sort=date').then(({ status, headers }) => {
      expect(status).to.eq(301);
      expect(headers.location).to.eq('/en/advanced-search?q=pfas&sort=date');
    });
  });

  it('redirects the Plone view and file suffixes to the parent object', () => {
    ['/en/about/view', '/en/about/@@view', '/en/about/folder_listing', '/en/about/folder_contents', '/en/about/at_download/file'].forEach((path) => {
      request(path).then(({ status, headers }) => {
        expect(status, path).to.eq(301);
        expect(headers.location, path).to.eq('/en/about');
      });
    });
  });

  it('answers 410 for the dead Plone endpoints', () => {
    ['/RSS', '/atom.xml', '/mail_password_form', '/en/mail_password_form'].forEach((path) => {
      request(path).then(({ status }) => {
        expect(status, path).to.eq(410);
      });
    });
  });

  it('leaves content, the search page and section pages ending in /search alone', () => {
    ['/en/about', '/en/advanced-search', '/en/newsroom/search', '/en/analysis/search'].forEach((path) => {
      request(path).then(({ status }) => {
        expect(status, path).to.eq(200);
      });
    });
  });

  it('lands on a working search page from a legacy search url', () => {
    cy.visit(`${origin}/@@search?SearchableText=pfas`);

    cy.url().should('include', '/en/advanced-search');
    cy.url().should('include', 'q=pfas');
    cy.title().should('contain', 'Advanced search');
    cy.get('.searchlib-block').should('exist');
  });

  it('lands on the parent page from a legacy view url', () => {
    cy.visit(`${origin}/en/about/view`);

    cy.url().should('match', /\/en\/about$/);
    cy.title().should('contain', 'About us');
  });
});
