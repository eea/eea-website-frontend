describe('Home page acceptance tests', () => {
  beforeEach(() => {
    cy.visit('https://staging.eea.europa.eu/en');
    // Catch ResizeObserver loop limit exceeded error and other uncaught exceptions
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('ResizeObserver loop limit exceeded') || err.message.includes('ResizeObserver loop completed with undelivered notifications')) {
        return false; // Prevent Cypress from failing the test due to these errors
      }
      return true; // Let other errors still fail the test
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
      cy.contains('nav', buttonText).should('exist'); // Check if each button exists in the navigation
    });
  });

  it('Check if Topics page title and content load', () => {
    cy.visit('https://staging.eea.europa.eu/en/topics');
    cy.contains('h1', 'Topics').should('be.visible');
    cy.contains('At a glance: our main topics').should('exist');
    const mainTopics = ["State of Europe's environment", 'Nature', 'Health'];
    mainTopics.forEach((topic) => {
      cy.contains(topic).should('be.visible'); // Check that each topic is visible
    });

    // Optionally, check that at least one image in the topic section is visible
    cy.wait(3000);
    cy.get('img').should('have.length.greaterThan', 0);
    cy.visit('https://staging.eea.europa.eu/en/topics/in-depth/agriculture-and-food');
    cy.wait(3000);
    cy.get('img').should('have.length.greaterThan', 0);
  });
});
