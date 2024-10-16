describe('Home page acceptance tests', () => {
  beforeEach(() => {
    Cypress.on('uncaught:exception', (err, runnable) => {
      return false;
    });
  });

  it('Check subsites dropdown', () => {
    cy.visit('https://staging.eea.europa.eu/en');

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
    cy.visit('https://staging.eea.europa.eu/en');

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
    cy.visit('https://staging.eea.europa.eu/en');

    expectedButtons.forEach((buttonText) => {
      cy.contains('nav', buttonText).should('exist');
    });
  });

  it('Check if Topics page title and content load', () => {
    cy.wait(3000);
    cy.visit('https://staging.eea.europa.eu/en/topics');
    cy.contains('h1', 'Topics').should('be.visible');
    cy.contains('At a glance: our main topics').should('exist');
    const mainTopics = ["State of Europe's environment", 'Nature', 'Health'];
    mainTopics.forEach((topic) => {
      cy.contains(topic).should('be.visible');
    });

    cy.wait(3000);
    cy.get('img').should('have.length.greaterThan', 0);
    cy.visit('https://staging.eea.europa.eu/en/topics/in-depth/agriculture-and-food');
    cy.wait(3000);
    cy.get('img').should('have.length.greaterThan', 0);
  });

  it('Test first query result in Publications', () => {
    cy.visit('https://www.eea.europa.eu/en/analysis/publications');
    cy.wait(4000);
    cy.get('.listing-item .listing-header').first().find('a').invoke('removeAttr', 'target').click();
    cy.wait(4000);
    cy.url().should('include', '/en/analysis/publications/europes-state-of-water-2024');
    cy.contains('h1', "Europe's state of water 2024: the need for improved water resilience").should('be.visible');
  });

  it('Test first query result in Datahub', () => {
    cy.visit('https://www.eea.europa.eu/en/datahub');
    cy.wait(4000);
    cy.get('.listing-item .listing-header').first().find('a').invoke('removeAttr', 'target').click();
    cy.wait(4000);
    cy.contains('h2', 'Datasets').should('be.visible');
    cy.get('.ui.accordion')
      .first()
      .should('exist')
      .then(($accordion) => {
        cy.wrap($accordion).click();
        cy.contains('h5', 'Download:').should('be.visible');
      });
  });
});
