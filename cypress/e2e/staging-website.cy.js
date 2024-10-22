describe('EEA staging website acceptance tests', () => {
  beforeEach(() => {
    cy.visit('/');
    Cypress.on('uncaught:exception', (err, runnable) => {
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
    cy.get('.hero-block-image').then(($div) => {
      // Get the background image URL from the inline style
      const backgroundImage = $div.css('background-image');

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
    cy.contains('a', 'Topics').click();
    cy.contains('a', 'Topics overview').click();
    cy.url().should('include', '/en/topics');
    cy.get('img').should('have.length.greaterThan', 0);
    cy.scrollTo(0, 1000);

    cy.contains('a', 'Agriculture and food system').click({ force: true });
    cy.url().should('include', '/en/topics/in-depth/agriculture-and-food');
    cy.get('img').should('have.length.greaterThan', 0);
  });

  it('Test first query result in Publications', () => {
    cy.visit('https://www.eea.europa.eu/en');
    cy.contains('a', 'Analysis and data').click();
    cy.contains('a', 'Publications').click({ force: true });
    cy.scrollTo(0, 1000);
    cy.get('.listing-item .listing-header').first().find('a').invoke('removeAttr', 'target').click();
    cy.get('img').should('have.length.greaterThan', 0);
  });

  it('Test first query result in Datahub', () => {
    cy.visit('https://www.eea.europa.eu/en');
    cy.contains('a', 'Analysis and data').click();
    cy.contains('a', 'Datahub').click({ force: true });
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
    cy.visit('https://www.eea.europa.eu/en');
    cy.contains('a', 'Analysis and data').click();
    cy.contains('a', 'Maps and charts').click({ force: true });
    cy.get('a.centered.fluid.image').first().invoke('removeAttr', 'target').click();
    cy.get('img').should('have.length.greaterThan', 0);
    // const tabs = ['Downloads', 'Data sources', 'Metadata', 'More info'];
    // tabs.forEach((tab) => {
    //   cy.contains('div', tab).should('be.visible');
    // });
  });

  it('Test first query result in Indicators', () => {
    cy.visit('https://www.eea.europa.eu/en');
    cy.contains('a', 'Analysis and data').click();
    cy.contains('a', 'Indicators').click({ force: true });
    cy.scrollTo(0, 1000);
    cy.get('.listing-item').should('be.visible').first().find('a').invoke('removeAttr', 'target').click({ force: true });
    cy.get('svg').should('exist');
  });

  it('Test first query result in Country fact sheets', () => {
    cy.visit('https://www.eea.europa.eu/en');
    cy.contains('a', 'Analysis and data').click();
    cy.contains('a', 'Country fact sheets').click({ force: true });
    cy.scrollTo(0, 1000);
    cy.get('.listing-header').should('be.visible').first().find('a').click({ force: true });
  });

  it('Test first query result in Countries', () => {
    cy.visit('https://www.eea.europa.eu/en');
    cy.contains('a', 'Countries').click();
    cy.contains('a', 'Austria').click({ force: true });
    cy.scrollTo(0, 1000);
    cy.get('.listing-header').should('be.visible').first().find('a').invoke('removeAttr', 'target').click({ force: true });
  });
});
