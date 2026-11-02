// The top-level navigation entries open a mega menu instead of navigating, and
// the menu links are duplicated in a hidden tablet/mobile accordion, so always
// click the entries rendered in the visible desktop panel.
const openMegaMenu = (label) => {
  cy.get(`nav a[title="${label}"]`).click();
  // The desktop panel can unmount right after opening, while the header data is
  // still settling, so reopen the menu when that happens.
  cy.wait(400);
  cy.get('body').then(($body) => {
    if (!$body.find('#mega-menu .menu-content').length) {
      cy.get(`nav a[title="${label}"]`).click();
    }
  });
  cy.get('#mega-menu .menu-content').should('be.visible');
};

const clickMegaMenuLink = (label) => {
  // Some entries open a new tab (target="_blank"), navigate in the current tab
  // instead so the test can follow the click.
  cy.contains('#mega-menu .menu-content a', label).invoke('removeAttr', 'target').click();
};

describe('EEA website acceptance tests', () => {
  beforeEach(() => {
    cy.visit('/');
    Cypress.on('uncaught:exception', (err, runnable) => {
      // Prevent Cypress from failing on uncaught exceptions
      // This is useful for testing third-party integrations or legacy code
      // that may throw non-critical errors
      // Log the error for debugging purposes
      console.error('Uncaught exception:', err.message);
      // Return false to prevent the test from failing
      return false;
    });
  });

  it('Check subsites dropdown', () => {
    cy.get('#theme-sites').click();
    // Verify that the dropdown is visible
    cy.get('#theme-sites.ui.active.visible.dropdown').should('be.visible');

    // Verify that all expected options are present
    const expectedOptions = ['European Environment Agency website', 'WISE marine - Marine information system for Europe', 'WISE freshwater - Freshwater information system for Europe', 'BISE - Biodiversity information system for Europe', 'FISE - Forest information system for Europe', 'European Climate and health observatory', 'ClimateADAPT', 'European Industrial Emissions Portal', 'Climate and energy in the EU', 'Copernicus Land Monitoring Service', 'Copernicus InSitu'];

    expectedOptions.forEach((option) => {
      cy.contains(option).should('exist'); // Verify each option exists
    });
  });

  it('Check if the hero image is loaded', () => {
    // The hero background image is set after hydration, once the block becomes
    // visible (IntersectionObserver), so wait for the style to be applied.
    cy.get('.hero-block-image')
      .invoke('css', 'background-image')
      .should('match', /^url\(["']?https?:/)
      .then((backgroundImage) => {
        // Extract the URL part from `background-image`
        const imageUrl = backgroundImage.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');

        // Send a request to the extracted image URL
        cy.request(imageUrl).then((response) => {
          // Check if the image status is 200 (OK)
          expect(response.status).to.eq(200);
        });
      });
  });

  it('Check if all main navigation buttons exist', () => {
    const expectedButtons = ['Topics', 'Analysis and data', 'Countries', 'Newsroom', 'About us'];

    expectedButtons.forEach((buttonText) => {
      cy.contains('nav', buttonText).should('exist');
    });
  });

  it('Check if Topics page title and content load', () => {
    openMegaMenu('Topics');
    clickMegaMenuLink('Topics overview');
    cy.url().should('include', '/en/topics');
    cy.get('img').should('have.length.greaterThan', 0);
    cy.scrollTo(0, 1000);

    cy.contains('a', 'Agriculture and food system').click({ force: true });
    cy.url().should('include', '/en/topics/in-depth/agriculture-and-food');
    cy.get('img').should('have.length.greaterThan', 0);
  });

  it('Test first query result in Publications', () => {
    cy.visit('/');
    openMegaMenu('Analysis and data');
    clickMegaMenuLink('Publications');
    cy.url().should('include', '/en/analysis/publications');
    cy.scrollTo(0, 1000);
    cy.get('.listing-item .listing-header').first().find('a').invoke('removeAttr', 'target').click();
    cy.get('img').should('have.length.greaterThan', 0);
  });

  it('Test first query result in Datahub', () => {
    cy.visit('/');
    openMegaMenu('Analysis and data');
    clickMegaMenuLink('Datahub');
    cy.url().should('include', '/en/datahub');
    cy.get('.listing-item .listing-header').first().find('a').invoke('removeAttr', 'target').click();
    cy.contains('h2', 'Datasets').should('be.visible');
    cy.get('.ui.accordion')
      .first()
      .should('exist')
      .then(($accordion) => {
        cy.wrap($accordion).click({ force: true });
        cy.contains('h5', 'Download:').should('be.visible');
      });
  });

  it('Test first query result in Maps and Charts', () => {
    cy.visit('/');
    openMegaMenu('Analysis and data');
    clickMegaMenuLink('Maps and charts');
    cy.url().should('include', '/en/analysis/maps-and-charts');
    // The cards markup differs between frontend versions: `.cardsVisualization`
    // cards in 7.x and `a.centered.fluid.image` in 6.x.
    cy.get('.cardsVisualization a.image, a.centered.fluid.image')
      .first()
      .invoke('removeAttr', 'target')
      .click();
    cy.get('img').should('have.length.greaterThan', 0);
    // const tabs = ['Downloads', 'Data sources', 'Metadata', 'More info'];
    // tabs.forEach((tab) => {
    //   cy.contains('div', tab).should('be.visible');
    // });
  });

  it('Test first query result in Indicators', () => {
    cy.visit('/');
    openMegaMenu('Analysis and data');
    clickMegaMenuLink('Indicators');
    cy.url().should('match', /\/en\/analysis\/indicators(\?|$)/);
    cy.scrollTo(0, 1000);
    cy.get('.listing-item').should('be.visible').first().find('a').invoke('removeAttr', 'target').click({ force: true });
    cy.get('svg').should('exist');
  });

  it('Test first query result in Country fact sheets', () => {
    cy.visit('/');
    openMegaMenu('Analysis and data');
    clickMegaMenuLink('Country fact sheets');
    cy.scrollTo(0, 1000);
    cy.get('.listing-header').should('be.visible').first().find('a').click({ force: true });
  });

  it('Test first query result in Countries', () => {
    cy.visit('/');
    openMegaMenu('Countries');
    clickMegaMenuLink('Austria');
    cy.url().should('include', '/en/countries/eea-member-countries/austria');
    cy.scrollTo(0, 1000);
    cy.get('.listing-header').should('be.visible').first().find('a').invoke('removeAttr', 'target').click({ force: true });
  });
});
